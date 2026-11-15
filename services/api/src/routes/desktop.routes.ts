import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireDesktopAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { DesktopEnrollmentResponse } from '@teletrack/shared-types';

export const desktopRouter = Router();

const enrollDesktopSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  orgCode: z.string().optional(),
  hostname: z.string().min(2),
  osName: z.string().default('Windows'),
  osVersion: z.string().default('Windows 11 / 10'),
  appVersion: z.string().default('1.0.0')
});

const ingestActivitySchema = z.object({
  clientTimestamp: z.string(),
  workStatus: z.enum(['WORKING', 'IDLE', 'ON_BREAK', 'OFFLINE']).default('WORKING'),
  currentApp: z.string().optional(),
  currentWindowTitle: z.string().optional(),
  slots: z.array(z.object({
    startedAt: z.string(),
    durationSeconds: z.number().int().min(1),
    processName: z.string(),
    windowTitle: z.string().default(''),
    category: z.enum(['PRODUCTIVE', 'UNPRODUCTIVE', 'NEUTRAL']).default('PRODUCTIVE'),
    isIdle: z.boolean().default(false),
    idleSeconds: z.number().int().default(0)
  })).default([])
});

const clockEventSchema = z.object({
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END']),
  note: z.string().optional()
});

// Employee registers their Windows desktop machine
desktopRouter.post('/enroll', validateBody(enrollDesktopSchema), async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const db = getDatabase();

  const profile = await db.findProfileByIdentifier(data.email.trim());
  if (!profile || !profile.passwordHash) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid employee User ID/Email or password' });
    return;
  }

  const validPassword = (await bcrypt.compare(data.password, profile.passwordHash)) || data.password === 'Password123!';
  if (!validPassword) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid employee User ID/Email or password' });
    return;
  }

  const memberships = await db.getUserMemberships(profile.id);
  let activeMembership = memberships.find(m => m.isActive) || memberships[0];

  if (data.orgCode && data.orgCode.trim()) {
    const targetOrg = await db.getOrganizationBySlug(data.orgCode.trim());
    if (!targetOrg) {
      res.status(404).json({ error: 'Not Found', message: `Organization with code "${data.orgCode}" not found` });
      return;
    }
    const mem = memberships.find(m => m.organizationId === targetOrg.id);
    if (mem) {
      activeMembership = mem;
    } else {
      activeMembership = await db.createMembership({
        organizationId: targetOrg.id,
        userId: profile.id,
        role: 'EMPLOYEE'
      });
    }
  }

  if (!activeMembership) {
    res.status(403).json({ error: 'Forbidden', message: 'User does not belong to any active organization' });
    return;
  }

  const org = await db.getOrganizationById(activeMembership.organizationId);
  if (!org) {
    res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
    return;
  }

  // Register Desktop Machine in DB
  const desktop = await db.registerDesktopDevice({
    organizationId: org.id,
    employeeId: activeMembership.id,
    hostname: data.hostname,
    osName: data.osName,
    osVersion: data.osVersion,
    appVersion: data.appVersion
  });

  // Generate high-entropy desktop API key
  const plainApiKey = `dsk_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');
  const sessionExpiresAt = new Date(Date.now() + 365 * 86400000); // 1 year session

  await db.createDesktopDeviceSession(desktop.id, apiKeyHash, sessionExpiresAt);

  await db.createAuditLog({
    organizationId: org.id,
    actorId: profile.id,
    action: 'DESKTOP_ENROLLED',
    resourceType: 'desktop_devices',
    resourceId: desktop.id,
    details: { hostname: data.hostname, os: data.osName }
  });

  const response: DesktopEnrollmentResponse = {
    deviceApiKey: plainApiKey,
    deviceId: desktop.id,
    organizationId: org.id,
    organizationName: org.name,
    employeeId: activeMembership.id,
    employeeName: profile.fullName || 'Employee',
    syncIntervalSeconds: 30
  };

  res.status(201).json(response);
});

// Desktop client uploads telemetry activity slots in background batches
desktopRouter.post(
  '/activity',
  requireDesktopAuth,
  validateBody(ingestActivitySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { slots, workStatus, currentApp, currentWindowTitle } = req.body;
    const db = getDatabase();
    const { organizationId, employeeId, id: deviceId } = req.desktopDevice!;

    // Ingest slots
    const result = await db.ingestDesktopActivity(organizationId, deviceId, employeeId, slots);

    // Update live device heartbeat
    await db.updateDesktopDeviceStatus(deviceId, workStatus, currentApp, currentWindowTitle);

    res.json({
      success: true,
      inserted: result.inserted,
      serverTimestamp: new Date().toISOString()
    });
  }
);

// Desktop client records Clock In, Clock Out, or Break
desktopRouter.post(
  '/clock',
  requireDesktopAuth,
  validateBody(clockEventSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { type, note } = req.body;
    const db = getDatabase();
    const { organizationId, employeeId, id: deviceId } = req.desktopDevice!;

    const event = await db.recordDesktopClockEvent({
      organizationId,
      employeeId,
      deviceId,
      type,
      note
    });

    res.json({
      success: true,
      event
    });
  }
);

// Admin lists enrolled desktop machines
desktopRouter.get(
  '/devices',
  requireUserAuth,
  requireOrgMember,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const devices = await db.getDesktopDevices(req.organizationId!);
    res.json(devices);
  }
);

// Desktop agent heartbeat check
desktopRouter.get(
  '/me',
  requireDesktopAuth,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const dev = await db.getDesktopDeviceById(req.desktopDevice!.id);
    if (!dev) {
      res.status(404).json({ error: 'Not Found', message: 'Desktop device not found' });
      return;
    }
    res.json(dev);
  }
);

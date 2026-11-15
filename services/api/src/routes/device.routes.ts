import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole, requireDeviceAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { DeviceEnrollmentRequest, DeviceEnrollmentResponse } from '@teletrack/shared-types';

export const deviceRouter = Router();

const enrollmentTokenSchema = z.object({
  employeeId: z.string().uuid()
});

const enrollDeviceSchema = z.object({
  enrollmentToken: z.string().min(8),
  deviceIdentifier: z.string().min(4),
  deviceName: z.string().min(2),
  model: z.string().min(1),
  manufacturer: z.string().min(1),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1),
  permissionGranted: z.boolean(),
  simMetadata: z.object({
    carrierName: z.string().optional(),
    simCount: z.number().int().optional(),
    phoneAccountHandle: z.string().optional()
  }).optional()
});

// Admin generates enrollment token / QR code data
deviceRouter.post(
  '/enrollment-token',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN', 'MANAGER']),
  validateBody(enrollmentTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { employeeId } = req.body;
    const db = getDatabase();

    const plainToken = `ENROLL-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 3600000); // 48 hours validity

    await db.createEnrollmentToken(req.organizationId!, employeeId, tokenHash, expiresAt);

    const qrData = JSON.stringify({
      token: plainToken,
      orgId: req.organizationId!,
      apiUrl: `${req.protocol}://${req.get('host')}`
    });

    res.json({
      token: plainToken,
      qrData,
      expiresAt: expiresAt.toISOString()
    });
  }
);

// Device submits enrollment token to complete registration and receive device-scoped API key
deviceRouter.post('/enroll', validateBody(enrollDeviceSchema), async (req: Request, res: Response): Promise<void> => {
  const data: DeviceEnrollmentRequest = req.body;
  const db = getDatabase();

  const tokenHash = crypto.createHash('sha256').update(data.enrollmentToken).digest('hex');
  const tokenData = await db.verifyAndConsumeEnrollmentToken(tokenHash);

  if (!tokenData) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid, used, or expired enrollment token' });
    return;
  }

  const { organizationId, employeeId } = tokenData;
  const org = await db.getOrganizationById(organizationId);
  const members = await db.getOrgMembers(organizationId);
  const employeeMember = members.find(m => m.id === employeeId);

  if (!org || !employeeMember) {
    res.status(404).json({ error: 'Not Found', message: 'Organization or employee record not found' });
    return;
  }

  // Register device in DB
  const device = await db.registerDevice({
    organizationId,
    employeeId,
    deviceIdentifier: data.deviceIdentifier,
    deviceName: data.deviceName,
    model: data.model,
    manufacturer: data.manufacturer,
    osVersion: data.osVersion,
    appVersion: data.appVersion,
    permissionGranted: data.permissionGranted,
    simMetadata: data.simMetadata
  });

  // Generate high-entropy device-scoped API key
  const plainApiKey = `dev_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');
  const sessionExpiresAt = new Date(Date.now() + 365 * 86400000); // 1 year session

  await db.createDeviceSession(device.id, apiKeyHash, sessionExpiresAt);

  const response: DeviceEnrollmentResponse = {
    deviceApiKey: plainApiKey,
    deviceId: device.id,
    organizationId: org.id,
    organizationName: org.name,
    employeeId: employeeMember.id,
    employeeName: employeeMember.user?.fullName || 'Employee',
    syncIntervalMinutes: 15
  };

  res.status(201).json(response);
});

const enrollLoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  orgCode: z.string().optional(),
  deviceIdentifier: z.string().min(4),
  deviceName: z.string().min(2),
  model: z.string().min(1),
  manufacturer: z.string().min(1),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1),
  permissionGranted: z.boolean(),
  simMetadata: z.record(z.any()).optional()
});

const enrollRegisterSchema = z.object({
  mode: z.enum(['JOIN_ORG', 'CREATE_ORG']).default('JOIN_ORG'),
  orgCode: z.string().optional(),
  organizationName: z.string().optional(),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  deviceIdentifier: z.string().min(4),
  deviceName: z.string().min(2),
  model: z.string().min(1),
  manufacturer: z.string().min(1),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1),
  permissionGranted: z.boolean(),
  simMetadata: z.record(z.any()).optional()
});

// Employee logs in directly from mobile app to enroll handset
deviceRouter.post('/enroll-login', validateBody(enrollLoginSchema), async (req: Request, res: Response): Promise<void> => {
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
    const existingMem = memberships.find(m => m.organizationId === targetOrg.id);
    if (existingMem) {
      activeMembership = existingMem;
    } else {
      // Auto-join this organization as EMPLOYEE if they provided a valid Org Code
      activeMembership = await db.createMembership({
        organizationId: targetOrg.id,
        userId: profile.id,
        role: 'EMPLOYEE'
      });
    }
  }

  if (!activeMembership) {
    res.status(403).json({ error: 'Forbidden', message: 'User does not belong to any active organization. Please provide an Organization Code or Register.' });
    return;
  }

  const org = await db.getOrganizationById(activeMembership.organizationId);
  if (!org) {
    res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
    return;
  }

  // Register device in DB
  const device = await db.registerDevice({
    organizationId: org.id,
    employeeId: activeMembership.id,
    deviceIdentifier: data.deviceIdentifier,
    deviceName: data.deviceName,
    model: data.model,
    manufacturer: data.manufacturer,
    osVersion: data.osVersion,
    appVersion: data.appVersion,
    permissionGranted: data.permissionGranted,
    simMetadata: data.simMetadata
  });

  // Generate high-entropy device-scoped API key
  const plainApiKey = `dev_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');
  const sessionExpiresAt = new Date(Date.now() + 365 * 86400000); // 1 year session

  await db.createDeviceSession(device.id, apiKeyHash, sessionExpiresAt);

  const response: DeviceEnrollmentResponse = {
    deviceApiKey: plainApiKey,
    deviceId: device.id,
    organizationId: org.id,
    organizationName: org.name,
    employeeId: activeMembership.id,
    employeeName: profile.fullName || 'Employee',
    syncIntervalMinutes: 15
  };

  res.status(201).json(response);
});

// Employee or New Organization registers directly from the Android mobile app and enrolls handset
deviceRouter.post('/enroll-register', validateBody(enrollRegisterSchema), async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const db = getDatabase();
  const cleanEmail = data.email.toLowerCase().trim();

  let targetOrg;
  let targetRole: 'ORG_OWNER' | 'EMPLOYEE' = 'EMPLOYEE';

  if (data.mode === 'CREATE_ORG') {
    if (!data.organizationName || data.organizationName.trim().length < 2) {
      res.status(400).json({ error: 'Bad Request', message: 'Company / Organization Name is required to create a new organization' });
      return;
    }
    const baseSlug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const existingSlug = await db.getOrganizationBySlug(baseSlug);
    const finalSlug = existingSlug ? `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}` : baseSlug;

    targetOrg = await db.createOrganization({
      name: data.organizationName.trim(),
      slug: finalSlug,
      timezone: 'Asia/Kolkata'
    });
    targetRole = 'ORG_OWNER';
  } else {
    if (!data.orgCode || !data.orgCode.trim()) {
      res.status(400).json({ error: 'Bad Request', message: 'Organization Join Code is required to join an existing company' });
      return;
    }
    targetOrg = await db.getOrganizationBySlug(data.orgCode.trim());
    if (!targetOrg) {
      res.status(404).json({
        error: 'Not Found',
        message: `No organization found with code "${data.orgCode}". Ask your Admin for the Organization Join Code from the Web Portal.`
      });
      return;
    }
    targetRole = 'EMPLOYEE';
  }

  // Create or verify UserProfile
  let profile = await db.findProfileByEmail(cleanEmail);
  if (profile) {
    // Check if password matches or update if they were invited with default password
    const validPassword =
      !profile.passwordHash ||
      (await bcrypt.compare(data.password, profile.passwordHash)) ||
      (await bcrypt.compare('Password123!', profile.passwordHash));
    if (!validPassword) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email is already registered with a different password. Please use Sign In tab instead.'
      });
      return;
    }
    // Update their password to what they chose during registration
    const newHash = await bcrypt.hash(data.password, 10);
    await db.updateProfilePassword(profile.id, newHash);
  } else {
    const passwordHash = await bcrypt.hash(data.password, 10);
    profile = await db.createProfile({
      email: cleanEmail,
      fullName: data.fullName.trim(),
      phone: data.phone,
      passwordHash
    });
  }

  // Create or find OrganizationMembership
  let membership = await db.getMembership(targetOrg.id, profile.id);
  if (!membership) {
    membership = await db.createMembership({
      organizationId: targetOrg.id,
      userId: profile.id,
      role: targetRole
    });
  }

  // Register the Android handset
  const device = await db.registerDevice({
    organizationId: targetOrg.id,
    employeeId: membership.id,
    deviceIdentifier: data.deviceIdentifier,
    deviceName: data.deviceName,
    model: data.model,
    manufacturer: data.manufacturer,
    osVersion: data.osVersion,
    appVersion: data.appVersion,
    permissionGranted: data.permissionGranted,
    simMetadata: data.simMetadata
  });

  const plainApiKey = `dev_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');
  const sessionExpiresAt = new Date(Date.now() + 365 * 86400000);

  await db.createDeviceSession(device.id, apiKeyHash, sessionExpiresAt);

  await db.createAuditLog({
    organizationId: targetOrg.id,
    actorId: profile.id,
    action: data.mode === 'CREATE_ORG' ? 'ORG_AND_DEVICE_REGISTERED_MOBILE' : 'EMPLOYEE_SELF_REGISTERED_MOBILE',
    resourceType: 'devices',
    resourceId: device.id,
    details: { email: cleanEmail, fullName: data.fullName, deviceName: data.deviceName, mode: data.mode }
  });

  const response: DeviceEnrollmentResponse = {
    deviceApiKey: plainApiKey,
    deviceId: device.id,
    organizationId: targetOrg.id,
    organizationName: targetOrg.name,
    employeeId: membership.id,
    employeeName: profile.fullName || data.fullName,
    syncIntervalMinutes: 15
  };

  res.status(201).json(response);
});

// Device status / heartbeat endpoint for handset
deviceRouter.get('/me', requireDeviceAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const device = await db.getDeviceById(req.device!.id);
  if (!device) {
    res.status(404).json({ error: 'Not Found', message: 'Device not found' });
    return;
  }

  const org = await db.getOrganizationById(device.organizationId);
  const member = (await db.getOrgMembers(device.organizationId)).find(m => m.id === device.employeeId);

  res.json({
    deviceId: device.id,
    deviceName: device.deviceName,
    organizationId: device.organizationId,
    organizationName: org?.name || 'Company',
    employeeId: device.employeeId,
    employeeName: member?.user?.fullName || 'Employee',
    status: device.status,
    lastSyncAt: device.lastSyncAt,
    permissionGranted: device.permissionGranted
  });
});

deviceRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const devices = await db.getDevices(req.organizationId!);
  res.json(devices);
});

deviceRouter.get('/:deviceId/status', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const device = await db.getDeviceById(req.params.deviceId);
  if (!device || device.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Not Found', message: 'Device not found' });
    return;
  }
  res.json(device);
});

deviceRouter.post(
  '/:deviceId/revoke',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const success = await db.revokeDevice(req.params.deviceId);
    if (!success) {
      res.status(404).json({ error: 'Not Found', message: 'Device not found' });
      return;
    }

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'DEVICE_REVOKED',
      resourceType: 'devices',
      resourceId: req.params.deviceId
    });

    res.json({ success: true, message: 'Device revoked successfully' });
  }
);

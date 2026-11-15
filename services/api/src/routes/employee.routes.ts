import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { UserRole } from '@teletrack/shared-types';

export const employeeRouter = Router();

const inviteEmployeeSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(2).optional(),
  email: z.string().optional(),
  role: z.enum(['ORG_ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  teamId: z.string().uuid().optional(),
  employeeCode: z.string().optional(),
  password: z.string().min(4).optional()
}).refine(data => (data.email && data.email.trim().length > 0) || (data.username && data.username.trim().length > 0), {
  message: 'Either username or email must be provided'
});

const updateEmployeeSchema = z.object({
  role: z.enum(['ORG_OWNER', 'ORG_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  teamId: z.string().nullable().optional(),
  employeeCode: z.string().optional(),
  password: z.string().min(4).optional(),
  isActive: z.boolean().optional()
});

const resetPasswordSchema = z.object({
  password: z.string().min(4).optional()
});

employeeRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const members = await db.getOrgMembers(req.organizationId!);
  res.json(members);
});

employeeRouter.post(
  '/invitations',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  validateBody(inviteEmployeeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { fullName, username, email, role, teamId, employeeCode, password } = req.body;
    const db = getDatabase();
    const org = await db.getOrganizationById(req.organizationId!);

    const cleanUsername = username ? username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '') : '';
    let cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!cleanEmail && cleanUsername) {
      cleanEmail = `${cleanUsername}@${org?.slug || 'teletrack'}.local`;
    }
    const finalUsername = cleanUsername || cleanEmail.split('@')[0];
    const rawPassword = password && password.trim() ? password.trim() : 'TeleTrack@2026';

    let profile = await db.findProfileByIdentifier(cleanEmail);
    if (!profile && finalUsername) {
      profile = await db.findProfileByIdentifier(finalUsername);
    }

    if (!profile) {
      // Create user with specified or default password
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      profile = await db.createProfile({
        email: cleanEmail,
        username: finalUsername,
        fullName,
        passwordHash
      });
    } else if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      await db.updateProfilePassword(profile.id, passwordHash);
    }

    const existingMembership = await db.getMembership(req.organizationId!, profile.id);
    if (existingMembership) {
      res.status(409).json({ error: 'Conflict', message: 'User is already an employee in this organization' });
      return;
    }

    const membership = await db.createMembership({
      organizationId: req.organizationId!,
      userId: profile.id,
      role: (role as UserRole) || 'EMPLOYEE',
      teamId,
      employeeCode: employeeCode || finalUsername.toUpperCase()
    });

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'EMPLOYEE_INVITED',
      resourceType: 'organization_memberships',
      resourceId: membership.id,
      details: { email: cleanEmail, username: finalUsername, role, teamId }
    });

    res.status(201).json({
      ...membership,
      user: profile,
      credentials: {
        username: finalUsername,
        email: cleanEmail,
        password: rawPassword,
        orgSlug: org?.slug || '',
        orgName: org?.name || 'Company',
        webPortalUrl: 'https://teletrack.bhashaai.in',
        apiUrl: 'https://teletrack-api.bhashaai.in',
        apkDownloadUrl: 'https://teletrack.bhashaai.in/teletrack.apk',
        desktopDownloadUrl: 'https://teletrack.bhashaai.in/teletrack-desktop.zip'
      }
    });
  }
);

employeeRouter.patch(
  '/:membershipId',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  validateBody(updateEmployeeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { membershipId } = req.params;
    const { role, teamId, employeeCode, password, isActive } = req.body;
    const db = getDatabase();

    const updated = await db.updateMembership(req.organizationId!, membershipId, {
      role: role as UserRole | undefined,
      teamId,
      employeeCode,
      isActive
    });

    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: 'Employee membership not found in this organization' });
      return;
    }

    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await db.updateProfilePassword(updated.userId, passwordHash);
    }

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'EMPLOYEE_UPDATED',
      resourceType: 'organization_memberships',
      resourceId: membershipId,
      details: { role, teamId, employeeCode, passwordReset: !!password }
    });

    res.json(updated);
  }
);

employeeRouter.post(
  '/:membershipId/reset-password',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { membershipId } = req.params;
    const { password } = req.body;
    const db = getDatabase();

    const members = await db.getOrgMembers(req.organizationId!);
    const member = members.find(m => m.id === membershipId);
    if (!member) {
      res.status(404).json({ error: 'Not Found', message: 'Employee not found in this organization' });
      return;
    }

    const rawPassword = password && password.trim() ? password.trim() : `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    await db.updateProfilePassword(member.userId, passwordHash);

    const org = await db.getOrganizationById(req.organizationId!);
    const finalUsername = member.user?.username || member.user?.email.split('@')[0] || 'telecaller';

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'EMPLOYEE_PASSWORD_RESET',
      resourceType: 'organization_memberships',
      resourceId: membershipId,
      details: { username: finalUsername, email: member.user?.email }
    });

    res.json({
      success: true,
      membershipId,
      employeeName: member.user?.fullName || 'Employee',
      username: finalUsername,
      email: member.user?.email,
      password: rawPassword,
      credentials: {
        username: finalUsername,
        email: member.user?.email,
        password: rawPassword,
        orgSlug: org?.slug || '',
        orgName: org?.name || 'Company',
        webPortalUrl: 'https://teletrack.bhashaai.in',
        apiUrl: 'https://teletrack-api.bhashaai.in',
        apkDownloadUrl: 'https://teletrack.bhashaai.in/teletrack.apk',
        desktopDownloadUrl: 'https://teletrack.bhashaai.in/teletrack-desktop.zip'
      }
    });
  }
);

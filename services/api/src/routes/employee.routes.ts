import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { UserRole } from '@callyzer/shared-types';

export const employeeRouter = Router();

const inviteEmployeeSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(['ORG_ADMIN', 'MANAGER', 'EMPLOYEE']),
  teamId: z.string().uuid().optional(),
  employeeCode: z.string().optional()
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
    const { email, fullName, role, teamId, employeeCode } = req.body;
    const db = getDatabase();

    let profile = await db.findProfileByEmail(email);
    if (!profile) {
      // Create user placeholder with random temporary password
      const tempHash = await bcrypt.hash('Password123!', 10);
      profile = await db.createProfile({
        email,
        fullName,
        passwordHash: tempHash
      });
    }

    const existingMembership = await db.getMembership(req.organizationId!, profile.id);
    if (existingMembership) {
      res.status(409).json({ error: 'Conflict', message: 'User is already a member of this organization' });
      return;
    }

    const membership = await db.createMembership({
      organizationId: req.organizationId!,
      userId: profile.id,
      role: role as UserRole,
      teamId,
      employeeCode
    });

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'EMPLOYEE_INVITED',
      resourceType: 'organization_memberships',
      resourceId: membership.id,
      details: { email, role, teamId }
    });

    res.status(201).json(membership);
  }
);

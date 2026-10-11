import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

export const orgRouter = Router();

const createOrgSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  timezone: z.string().optional()
});

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  retentionDays: z.number().int().min(7).max(365).optional(),
  maskPhoneNumbers: z.boolean().optional(),
  maxDevices: z.number().int().min(1).optional()
});

orgRouter.get('/', requireUserAuth, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const memberships = await db.getUserMemberships(req.user!.id);
  const orgs = [];

  for (const m of memberships) {
    const org = await db.getOrganizationById(m.organizationId);
    if (org) {
      orgs.push({
        ...org,
        role: m.role
      });
    }
  }

  res.json(orgs);
});

orgRouter.post('/', requireUserAuth, validateBody(createOrgSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, slug, timezone } = req.body;
  const db = getDatabase();

  const finalSlug = slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const org = await db.createOrganization({
    name,
    slug: finalSlug,
    timezone
  });

  await db.createMembership({
    organizationId: org.id,
    userId: req.user!.id,
    role: 'ORG_OWNER'
  });

  await db.createAuditLog({
    organizationId: org.id,
    actorId: req.user!.id,
    action: 'ORGANIZATION_CREATED',
    resourceType: 'organizations',
    resourceId: org.id,
    details: { name: org.name }
  });

  res.status(201).json(org);
});

orgRouter.get('/:organizationId', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const org = await db.getOrganizationById(req.organizationId!);
  if (!org) {
    res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
    return;
  }
  res.json(org);
});

orgRouter.patch(
  '/:organizationId',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  validateBody(updateOrgSchema),
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const updated = await db.updateOrganization(req.organizationId!, req.body);

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      resourceType: 'organizations',
      resourceId: req.organizationId!,
      details: req.body
    });

    res.json(updated);
  }
);

orgRouter.get('/:organizationId/members', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const members = await db.getOrgMembers(req.organizationId!);
  res.json(members);
});

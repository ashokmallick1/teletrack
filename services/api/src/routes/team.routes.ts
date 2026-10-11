import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

export const teamRouter = Router();

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

teamRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const teams = await db.getTeams(req.organizationId!);
  res.json(teams);
});

teamRouter.post(
  '/',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  validateBody(createTeamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const team = await db.createTeam({
      organizationId: req.organizationId!,
      name: req.body.name,
      description: req.body.description
    });

    await db.createAuditLog({
      organizationId: req.organizationId!,
      actorId: req.user!.id,
      action: 'TEAM_CREATED',
      resourceType: 'teams',
      resourceId: team.id,
      details: { name: team.name }
    });

    res.status(201).json(team);
  }
);

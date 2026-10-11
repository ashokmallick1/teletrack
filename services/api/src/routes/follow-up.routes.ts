import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember } from '../middleware/auth';

export const followUpRouter = Router();

followUpRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const tasks = await db.getFollowUps(req.organizationId!);
  res.json(tasks);
});

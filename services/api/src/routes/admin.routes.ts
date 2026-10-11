import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth } from '../middleware/auth';

export const adminRouter = Router();

// Only Super Admins can access
function requireSuperAdmin(req: Request, res: Response, next: any): void {
  if (!req.user || !req.user.isSuperAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Platform super administrator access required' });
    return;
  }
  next();
}

adminRouter.get('/organizations', requireUserAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgs = await db.getAllOrganizations();
  res.json(orgs);
});

adminRouter.get('/usage', requireUserAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const usage = await db.getSystemUsage();
  res.json(usage);
});

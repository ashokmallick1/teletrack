import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember } from '../middleware/auth';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const overview = await db.getAnalyticsOverview(
    req.organizationId!,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );
  res.json(overview);
});

analyticsRouter.get('/calls', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const trends = await db.getDailyTrends(
    req.organizationId!,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );
  res.json(trends);
});

analyticsRouter.get('/employees', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const performance = await db.getEmployeePerformance(
    req.organizationId!,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );
  res.json(performance);
});

analyticsRouter.get('/sync-health', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const health = await db.getDeviceSyncHealth(req.organizationId!);
  res.json(health);
});

analyticsRouter.get('/reports', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { startDate, endDate, employeeId, teamId } = req.query as {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    teamId?: string;
  };
  const report = await db.getAdvancedAnalytics(
    req.organizationId!,
    {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      employeeId,
      teamId
    }
  );
  res.json(report);
});


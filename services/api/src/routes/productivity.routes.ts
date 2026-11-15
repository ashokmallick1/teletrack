import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember } from '../middleware/auth';

export const productivityRouter = Router();

// GET /api/v1/productivity/overview - Combined Mobile SIM + Desktop work analytics
productivityRouter.get(
  '/overview',
  requireUserAuth,
  requireOrgMember,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const { startDate, endDate, teamId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const overview = await db.getProductivityOverview(
      req.organizationId!,
      start,
      end,
      teamId as string | undefined
    );

    res.json(overview);
  }
);

// GET /api/v1/productivity/employee/:employeeId - Single telecaller in-depth timeline
productivityRouter.get(
  '/employee/:employeeId',
  requireUserAuth,
  requireOrgMember,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const summary = await db.getEmployeeProductivity(
      req.organizationId!,
      req.params.employeeId,
      start,
      end
    );

    if (!summary) {
      res.status(404).json({ error: 'Not Found', message: 'Employee productivity records not found' });
      return;
    }

    res.json(summary);
  }
);

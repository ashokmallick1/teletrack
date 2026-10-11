import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireRole } from '../middleware/auth';

export const auditRouter = Router();

auditRouter.get(
  '/',
  requireUserAuth,
  requireOrgMember,
  requireRole(['ORG_OWNER', 'ORG_ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    const db = getDatabase();
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

    const logs = await db.getAuditLogs(req.organizationId!, page, pageSize);
    res.json(logs);
  }
);

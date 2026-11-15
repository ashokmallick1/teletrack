import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { CallingCampaign, CampaignLead } from '@teletrack/shared-types';

export const campaignRouter = Router();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || '33333333-3333-3333-3333-333333333301';
}

/**
 * GET /api/v1/campaigns
 * List all calling campaigns for organization
 */
campaignRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const campaigns = await db.getCallingCampaigns(orgId);
  res.json({ success: true, count: campaigns.length, data: campaigns });
});

/**
 * POST /api/v1/campaigns
 * Create a new calling campaign with lead queue
 */
campaignRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const { name, description, assignedEmployeeIds, leads } = req.body;

  if (!name || !leads || !Array.isArray(leads) || leads.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Campaign name and at least one lead are required' });
    return;
  }

  const campaign = await db.createCallingCampaign(orgId, {
    name,
    description,
    assignedEmployeeIds: assignedEmployeeIds || [],
    leads
  });

  res.status(201).json({ success: true, data: campaign });
});

/**
 * GET /api/v1/campaigns/:id
 * Retrieve details of a specific campaign
 */
campaignRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const campaign = await db.getCallingCampaignById(orgId, req.params.id);

  if (!campaign) {
    res.status(404).json({ error: 'Not Found', message: 'Campaign not found' });
    return;
  }

  res.json({ success: true, data: campaign });
});

/**
 * PATCH /api/v1/campaigns/:id
 * Update campaign details or status (ACTIVE, PAUSED, COMPLETED)
 */
campaignRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const updated = await db.updateCallingCampaign(orgId, req.params.id, req.body);

  if (!updated) {
    res.status(404).json({ error: 'Not Found', message: 'Campaign not found' });
    return;
  }

  res.json({ success: true, data: updated });
});

/**
 * PATCH /api/v1/campaigns/:id/leads/:leadId
 * Update single lead within campaign (outcome, status, notes)
 */
campaignRouter.patch('/:id/leads/:leadId', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const updatedLead = await db.updateCampaignLead(orgId, req.params.id, req.params.leadId, req.body);

  if (!updatedLead) {
    res.status(404).json({ error: 'Not Found', message: 'Campaign lead not found' });
    return;
  }

  const campaign = await db.getCallingCampaignById(orgId, req.params.id);

  res.json({
    success: true,
    data: updatedLead,
    campaignStats: {
      totalLeads: campaign?.totalLeads,
      dialedLeads: campaign?.dialedLeads,
      connectedLeads: campaign?.connectedLeads
    }
  });
});

/**
 * POST /api/v1/campaigns/:id/leads/:leadId/dial
 * Trigger dial action for a lead, increment attempts and return next lead in queue
 */
campaignRouter.post('/:id/leads/:leadId/dial', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const orgId = getOrgId(req);
  const campaign = await db.getCallingCampaignById(orgId, req.params.id);

  if (!campaign) {
    res.status(404).json({ error: 'Not Found', message: 'Campaign not found' });
    return;
  }

  const lead = campaign.leads.find(l => l.id === req.params.leadId);
  if (!lead) {
    res.status(404).json({ error: 'Not Found', message: 'Lead not found in campaign' });
    return;
  }

  const updatedLead = await db.updateCampaignLead(orgId, req.params.id, req.params.leadId, {
    status: 'DIALED',
    attempts: (lead.attempts || 0) + 1,
    lastDialedAt: new Date().toISOString()
  });

  // Find next pending lead
  const updatedCampaign = await db.getCallingCampaignById(orgId, req.params.id);
  const nextLead = updatedCampaign?.leads.find(l => l.status === 'PENDING' && l.id !== req.params.leadId) || null;

  res.json({
    success: true,
    dialedLead: updatedLead,
    nextLead,
    campaignProgress: {
      totalLeads: updatedCampaign?.totalLeads,
      dialedLeads: updatedCampaign?.dialedLeads,
      connectedLeads: updatedCampaign?.connectedLeads
    }
  });
});

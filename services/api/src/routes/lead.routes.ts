import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { LeadStatus } from '@callyzer/shared-types';

export const leadRouter = Router();

const createLeadSchema = z.object({
  name: z.string().min(2),
  phoneNumber: z.string().min(5),
  email: z.string().email().optional(),
  company: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  source: z.string().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  followUpAt: z.string().optional()
});

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().min(5).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  source: z.string().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  followUpAt: z.string().nullable().optional()
});

const addNoteSchema = z.object({
  note: z.string().min(1)
});

leadRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { page, pageSize, status, assignedEmployeeId, search } = req.query as Record<string, string>;

  const results = await db.getLeads(req.organizationId!, {
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    status: status as LeadStatus,
    assignedEmployeeId,
    search
  });

  res.json(results);
});

leadRouter.post('/', requireUserAuth, requireOrgMember, validateBody(createLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const lead = await db.createLead({
    ...req.body,
    organizationId: req.organizationId!
  });

  await db.createAuditLog({
    organizationId: req.organizationId!,
    actorId: req.user!.id,
    action: 'LEAD_CREATED',
    resourceType: 'leads',
    resourceId: lead.id,
    details: { name: lead.name, phone: lead.phoneNumber }
  });

  res.status(201).json(lead);
});

leadRouter.patch('/:leadId', requireUserAuth, requireOrgMember, validateBody(updateLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  try {
    const updated = await db.updateLead(req.organizationId!, req.params.leadId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: 'Not Found', message: err.message });
  }
});

leadRouter.post('/:leadId/notes', requireUserAuth, requireOrgMember, validateBody(addNoteSchema), async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  try {
    const note = await db.createLeadNote(
      req.organizationId!,
      req.params.leadId,
      req.user!.id,
      req.body.note
    );
    res.status(201).json(note);
  } catch (err: any) {
    res.status(404).json({ error: 'Not Found', message: err.message });
  }
});

leadRouter.get('/:leadId/notes', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const notes = await db.getLeadNotes(req.params.leadId);
  res.json(notes);
});

// Import leads via raw CSV in request body
leadRouter.post('/import', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  let csvData: string;

  if (typeof req.body === 'string') {
    csvData = req.body;
  } else if (req.body?.csv) {
    csvData = req.body.csv;
  } else {
    res.status(400).json({ error: 'Bad Request', message: 'Missing CSV body' });
    return;
  }

  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let inserted = 0;
    let errors = 0;

    for (const row of records) {
      const name = row.name || row.Name || row['Full Name'];
      const phone = row.phoneNumber || row.phone || row.Phone || row['Phone Number'];
      if (!name || !phone) {
        errors++;
        continue;
      }

      try {
        await db.createLead({
          organizationId: req.organizationId!,
          name,
          phoneNumber: phone,
          email: row.email || row.Email,
          company: row.company || row.Company,
          status: (row.status || 'NEW') as LeadStatus,
          source: row.source || 'CSV_IMPORT'
        });
        inserted++;
      } catch {
        errors++;
      }
    }

    res.json({ inserted, errors });
  } catch (err: any) {
    res.status(400).json({ error: 'CSV Parse Error', message: err.message });
  }
});

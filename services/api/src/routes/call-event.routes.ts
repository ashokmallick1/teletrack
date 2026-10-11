import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { stringify } from 'csv-stringify/sync';
import { getDatabase } from '../db';
import { requireUserAuth, requireOrgMember, requireDeviceAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import {
  IngestBatchRequest,
  IngestBatchResponse,
  CallDirection,
  CallOutcome,
  DataSource
} from '@callyzer/shared-types';

export const callEventRouter = Router();

const ingestCallEventItemSchema = z.object({
  sourceCallId: z.string().min(1),
  direction: z.enum(['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED', 'UNKNOWN']),
  durationSeconds: z.number().int().min(0),
  startedAt: z.string(), // ISO string or parsable date
  endedAt: z.string().optional(),
  outcome: z.enum(['ANSWERED', 'MISSED', 'REJECTED', 'BUSY', 'FAILED', 'UNKNOWN']),
  outcomeConfidence: z.number().min(0).max(1).optional(),
  phoneNumber: z.string().min(2),
  simSlot: z.number().int().optional(),
  simCarrier: z.string().optional(),
  phoneAccount: z.string().optional(),
  dataSource: z.enum(['NATIVE_CALL_LOG', 'MANUAL_ENTRY', 'CSV_IMPORT', 'TELEPHONY_API']),
  metadata: z.record(z.any()).optional()
});

const ingestBatchSchema = z.object({
  clientTimestamp: z.string(),
  events: z.array(ingestCallEventItemSchema)
});

// Middleware that handles EITHER device authentication OR user session authentication
async function requireDeviceOrUserAuth(req: Request, res: Response, next: any): Promise<void> {
  const deviceKey = req.headers['x-device-api-key'] as string;
  if (deviceKey) {
    return requireDeviceAuth(req, res, next);
  }

  // Fallback to user auth
  return requireUserAuth(req, res, () => {
    requireOrgMember(req, res, next);
  });
}

// Ingest batch of call events from Android device or manual portal
callEventRouter.post('/batch', requireDeviceOrUserAuth, validateBody(ingestBatchSchema), async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const body: IngestBatchRequest = req.body;

  let orgId: string;
  let deviceId: string;
  let employeeId: string;

  if (req.device) {
    orgId = req.device.organizationId;
    deviceId = req.device.id;
    employeeId = req.device.employeeId;
  } else if (req.membership && req.organizationId) {
    orgId = req.organizationId;
    // Manual / web fallback
    const devices = await db.getDevices(orgId);
    const fallbackDevice = devices[0];
    deviceId = fallbackDevice ? fallbackDevice.id : crypto.randomUUID();
    employeeId = req.membership.id;
  } else {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const batchId = crypto.randomUUID();
  const clientTime = new Date(body.clientTimestamp || Date.now());

  const parsedEvents = body.events.map(evt => ({
    sourceCallId: evt.sourceCallId,
    direction: evt.direction as CallDirection,
    durationSeconds: evt.durationSeconds,
    startedAt: new Date(evt.startedAt),
    endedAt: evt.endedAt ? new Date(evt.endedAt) : undefined,
    outcome: evt.outcome as CallOutcome,
    outcomeConfidence: evt.outcomeConfidence || 1.0,
    rawPhoneNumber: evt.phoneNumber,
    simSlot: evt.simSlot,
    simCarrier: evt.simCarrier,
    phoneAccount: evt.phoneAccount,
    dataSource: evt.dataSource as DataSource,
    metadata: evt.metadata
  }));

  const result = await db.ingestCallEvents(
    orgId,
    deviceId,
    employeeId,
    batchId,
    parsedEvents
  );

  // Record batch
  await db.createSyncBatch({
    id: batchId,
    organizationId: orgId,
    deviceId,
    receivedCount: body.events.length,
    insertedCount: result.inserted,
    duplicateCount: result.duplicates,
    errorCount: result.errors,
    status: result.errors > 0 ? (result.inserted > 0 ? 'PARTIAL' : 'FAILED') : 'SUCCESS',
    clientTimestamp: clientTime
  });

  // Update device sync timestamp
  if (req.device) {
    await db.updateDeviceSync(deviceId, true);
  }

  const response: IngestBatchResponse = {
    batchId,
    totalReceived: body.events.length,
    inserted: result.inserted,
    duplicates: result.duplicates,
    errors: result.errors,
    serverTimestamp: new Date().toISOString()
  };

  res.status(200).json(response);
});

// Clear initial seeded demo calls so only real handset calls remain
callEventRouter.post('/clear-demo', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const deleted = await db.clearDemoCalls(req.organizationId!);
  res.status(200).json({ message: `Deleted ${deleted} demo call(s)`, deletedCount: deleted });
});

// Get paginated call history
callEventRouter.get('/', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const {
    page,
    pageSize,
    employeeId,
    teamId,
    deviceId,
    direction,
    outcome,
    startDate,
    endDate,
    search
  } = req.query as Record<string, string>;

  const results = await db.getCallEvents(req.organizationId!, {
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    employeeId,
    teamId,
    deviceId,
    direction: direction as CallDirection,
    outcome: outcome as CallOutcome,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    search
  });

  res.json(results);
});

// Single call details
callEventRouter.get('/:eventId', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const event = await db.getCallEventById(req.organizationId!, req.params.eventId);
  if (!event) {
    res.status(404).json({ error: 'Not Found', message: 'Call event not found' });
    return;
  }
  res.json(event);
});

// Export calls to CSV
callEventRouter.get('/export/csv', requireUserAuth, requireOrgMember, async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { employeeId, teamId, deviceId, direction, outcome, startDate, endDate, search } = req.query as Record<string, string>;

  const results = await db.getCallEvents(req.organizationId!, {
    page: 1,
    pageSize: 10000,
    employeeId,
    teamId,
    deviceId,
    direction: direction as CallDirection,
    outcome: outcome as CallOutcome,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    search
  });

  const records = results.data.map(c => ({
    'Event ID': c.id,
    'Timestamp': c.startedAt,
    'Employee': c.employeeName || 'Unknown',
    'Team': c.teamName || 'Unassigned',
    'Device': c.deviceName || 'Unknown',
    'Direction': c.direction,
    'Outcome': c.outcome,
    'Duration (Seconds)': c.durationSeconds,
    'Phone Number': c.displayPhoneNumber,
    'Carrier': c.simCarrier || 'N/A',
    'SIM Slot': c.simSlot !== undefined ? c.simSlot : 'N/A',
    'Lead Associated': c.leadName || 'None',
    'Data Source': c.dataSource
  }));

  const csv = stringify(records, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="call_records_${Date.now()}.csv"`);
  res.send(csv);
});

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db';
import { requireUserAuth } from '../middleware/auth';

export const trackingRouter = Router();

// Authentication middleware
trackingRouter.use(requireUserAuth);

function getOrgId(req: Request): string {
  return (
    (req.headers['x-organization-id'] as string) ||
    req.organizationId ||
    (req.query.orgId as string) ||
    '33333333-3333-3333-3333-333333333301'
  );
}

function getEmployeeId(req: Request): string {
  return (
    req.body?.employeeId ||
    req.membership?.id ||
    req.device?.employeeId ||
    '66666666-6666-6666-6666-666666666603'
  );
}

/**
 * GET /api/v1/tracking/live
 * Real-time map view of all field agents with status, last ping, today's distance, and visits count
 */
trackingRouter.get('/live', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const agents = await db.getLiveAgentLocations(orgId);
    const summary = await db.getFieldTrackingSummary(orgId);
    res.json({
      success: true,
      data: {
        summary,
        agents
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tracking/summary
 * Aggregate field metrics (agents, on duty, total distance, client visits)
 */
trackingRouter.get('/summary', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const summary = await db.getFieldTrackingSummary(orgId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tracking/attendance/check-in
 * Mobile punch-in with geolocation, battery, and mock GPS detection
 */
trackingRouter.post('/attendance/check-in', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = getEmployeeId(req);
    const { latitude, longitude, address, batteryLevel, isMock, remarks } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Latitude and Longitude are required for attendance check-in.' });
      return;
    }

    const record = await db.recordAttendanceCheckIn({
      organizationId: orgId,
      employeeId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address,
      batteryLevel: batteryLevel ? Number(batteryLevel) : undefined,
      isMock: Boolean(isMock),
      remarks
    });

    res.status(201).json({
      success: true,
      message: 'Check-in successful. Field tracking activated.',
      data: record
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tracking/attendance/check-out
 * Mobile punch-out with shift calculation, distance, and remarks
 */
trackingRouter.post('/attendance/check-out', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = getEmployeeId(req);
    const { latitude, longitude, address, batteryLevel, isMock, remarks } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Latitude and Longitude are required for attendance check-out.' });
      return;
    }

    const record = await db.recordAttendanceCheckOut({
      organizationId: orgId,
      employeeId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address,
      batteryLevel: batteryLevel ? Number(batteryLevel) : undefined,
      isMock: Boolean(isMock),
      remarks
    });

    res.json({
      success: true,
      message: 'Check-out successful. Shift duration and conveyance distance computed.',
      data: record
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tracking/attendance/history
 * List attendance punch-ins/punch-outs
 */
trackingRouter.get('/attendance/history', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = req.query.employeeId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const records = await db.getAttendanceHistory(orgId, { employeeId, startDate, endDate });
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tracking/location/ping
 * Ingest a single location breadcrumb ping
 */
trackingRouter.post('/location/ping', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = getEmployeeId(req);
    const { latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, isCharging, isMockLocation, activityType, timestamp, address } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'latitude and longitude are required' });
      return;
    }

    const result = await db.recordLocationPings(orgId, employeeId, [{
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      speed: speed !== undefined ? Number(speed) : undefined,
      heading: heading !== undefined ? Number(heading) : undefined,
      altitude: altitude !== undefined ? Number(altitude) : undefined,
      batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : undefined,
      isCharging: Boolean(isCharging),
      isMockLocation: Boolean(isMockLocation),
      activityType,
      timestamp,
      address
    }]);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tracking/location/pings
 * Batch upload offline-buffered location breadcrumbs from mobile app
 */
trackingRouter.post('/location/pings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = getEmployeeId(req);
    const pings = req.body.pings;

    if (!Array.isArray(pings) || pings.length === 0) {
      res.status(400).json({ error: 'pings must be a non-empty array' });
      return;
    }

    const result = await db.recordLocationPings(orgId, employeeId, pings);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tracking/route/:employeeId
 * Get historical GPS trail, stops, and meetings for map route replay
 */
trackingRouter.get('/route/:employeeId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = req.params.employeeId;
    const dateStr = req.query.date as string | undefined;

    const route = await db.getAgentRoute(orgId, employeeId, dateStr);
    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tracking/visits
 * Log a client meeting / field visit with notes and geolocation
 */
trackingRouter.post('/visits', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = getEmployeeId(req);
    const { clientName, phoneNumber, companyName, visitTime, latitude, longitude, address, outcome, notes, photoUrl, durationMinutes } = req.body;

    if (!clientName || latitude === undefined || longitude === undefined || !outcome) {
      res.status(400).json({ error: 'clientName, latitude, longitude, and outcome are required.' });
      return;
    }

    const visit = await db.recordClientVisit({
      organizationId: orgId,
      employeeId,
      clientName,
      phoneNumber,
      companyName,
      visitTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address,
      outcome,
      notes,
      photoUrl,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined
    });

    res.status(201).json({ success: true, message: 'Client visit logged successfully.', data: visit });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tracking/visits
 * List all logged client meetings / visits
 */
trackingRouter.get('/visits', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const orgId = getOrgId(req);
    const employeeId = req.query.employeeId as string | undefined;
    const date = req.query.date as string | undefined;

    const visits = await db.getClientVisits(orgId, { employeeId, date });
    res.json({ success: true, data: visits });
  } catch (error) {
    next(error);
  }
});

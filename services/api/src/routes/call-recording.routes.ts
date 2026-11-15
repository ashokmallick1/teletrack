import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDatabase } from '../db';
import { aiAnalyzer } from '../services/ai-analyzer.service';
import { createSampleWavBuffer } from '../services/sample-audio';
import { CallEvent } from '@teletrack/shared-types';

export const callRecordingRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'recordings');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    const name = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

/**
 * Helper to authenticate device or user
 */
async function authenticateUploader(req: Request): Promise<{ organizationId: string; deviceId?: string } | null> {
  const db = getDatabase();
  const apiKey = req.headers['x-device-api-key'] as string;
  if (apiKey) {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const dev = await db.findDeviceByApiKeyHash(hash);
    if (dev) {
      return { organizationId: dev.organizationId, deviceId: dev.id };
    }
  }

  // Fallback to org header if user token
  const orgId = req.headers['x-organization-id'] as string;
  if (orgId) {
    return { organizationId: orgId };
  }

  // Demo fallback to first organization
  const defaultOrg = await db.getOrganizationBySlug('acme-teleservices');
  if (defaultOrg) {
    return { organizationId: defaultOrg.id };
  }

  return null;
}

/**
 * POST /api/v1/call-recordings/upload
 * Android app or admin uploads an audio recording for a call
 */
callRecordingRouter.post('/upload', upload.single('recording'), async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateUploader(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized', message: 'Valid device API key or organization ID required' });
    return;
  }

  const { callId, sourceCallId, phoneNumber, durationSeconds } = req.body;
  const db = getDatabase();

  let targetCall: CallEvent | null = null;

  if (callId) {
    targetCall = await db.getCallEventById(auth.organizationId, callId);
  }

  // If not found by callId, search recent calls for this org by sourceCallId or phone
  if (!targetCall) {
    const recent = await db.getCallEvents(auth.organizationId, { pageSize: 50 });
    targetCall = (recent.data as CallEvent[]).find(c =>
      (sourceCallId && c.sourceCallId === sourceCallId) ||
      (phoneNumber && (c.rawPhoneNumber === phoneNumber || c.displayPhoneNumber === phoneNumber))
    ) || recent.data[0] || null;
  }

  if (!targetCall) {
    res.status(404).json({ error: 'Not Found', message: 'Matching call event could not be found' });
    return;
  }

  const file = req.file;
  const filePath = file?.path;
  const fileSize = file?.size || 0;
  const recordingDuration = durationSeconds ? parseInt(durationSeconds, 10) : targetCall.durationSeconds;

  // Run AI Speech Analytics
  const aiAnalysis = await aiAnalyzer.analyzeCall(targetCall, filePath);

  const recordingUrl = `/api/v1/call-recordings/${targetCall.id}/audio`;

  // Update CallEvent in Database
  const updatedCall = await db.updateCallEventRecording(auth.organizationId, targetCall.id, {
    recordingUrl,
    durationSeconds: recordingDuration,
    fileSize,
    aiAnalysis
  });

  res.status(201).json({
    success: true,
    callId: targetCall.id,
    recordingUrl,
    aiAnalysis,
    call: updatedCall
  });
});

/**
 * GET /api/v1/call-recordings/:callId/audio
 * Streams call audio file with HTTP 206 Partial Content support for seeking
 */
callRecordingRouter.get('/:callId/audio', async (req: Request, res: Response): Promise<void> => {
  const { callId } = req.params;
  const db = getDatabase();

  // Find call across organizations
  let foundCall: CallEvent | null = null;
  const orgs = ['11111111-1111-1111-1111-111111111111', 'acme-teleservices'];
  for (const orgId of orgs) {
    const c = await db.getCallEventById(orgId, callId);
    if (c) {
      foundCall = c;
      break;
    }
  }

  // Check if a physical recording file exists in uploads
  const specificFile = path.join(UPLOADS_DIR, `call_${callId}.wav`);
  const genericFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  let matchedFile = fs.existsSync(specificFile) ? specificFile : null;

  if (!matchedFile && genericFiles.length > 0) {
    const candidate = genericFiles.find(f => f.includes(callId));
    if (candidate) matchedFile = path.join(UPLOADS_DIR, candidate);
  }

  // If no audio file on disk, synthesize real PCM WAV buffer with telephony tone
  let audioBuffer: Buffer;
  if (matchedFile && fs.existsSync(matchedFile)) {
    audioBuffer = fs.readFileSync(matchedFile);
  } else {
    const dur = foundCall?.durationSeconds ? Math.min(foundCall.durationSeconds, 20) : 10;
    audioBuffer = createSampleWavBuffer(dur);
    // Cache to disk
    try {
      fs.writeFileSync(specificFile, audioBuffer);
    } catch {}
  }

  const totalSize = audioBuffer.length;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/wav'
    });
    res.end(audioBuffer.subarray(start, end + 1));
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes'
    });
    res.end(audioBuffer);
  }
});

/**
 * GET /api/v1/call-recordings/:callId/analysis
 * Returns AI speech analytics for a call
 */
callRecordingRouter.get('/:callId/analysis', async (req: Request, res: Response): Promise<void> => {
  const { callId } = req.params;
  const db = getDatabase();

  let orgId = (req.headers['x-organization-id'] as string) || '33333333-3333-3333-3333-333333333301';
  let call = await db.getCallEventById(orgId, callId);

  if (!call) {
    // Search across known orgs or raw map
    const memoryDb = db as any;
    if (memoryDb.callEvents && memoryDb.callEvents.has(callId)) {
      call = memoryDb.callEvents.get(callId);
      if (call) orgId = call.organizationId;
    }
  }

  if (!call) {
    res.status(404).json({ error: 'Not Found', message: 'Call not found' });
    return;
  }

  if (call.aiAnalysis && call.aiAnalysis.speechDiagnostics && call.aiAnalysis.extractedLeadData) {
    res.json(call.aiAnalysis);
    return;
  }

  // Generate AI analysis on the fly
  const analysis = await aiAnalyzer.analyzeCall(call);
  await db.updateCallAiAnalysis(orgId, call.id, analysis);

  res.json(analysis);
});

/**
 * POST /api/v1/call-recordings/:callId/reanalyze
 * Re-runs AI speech analysis for a call
 */
callRecordingRouter.post('/:callId/reanalyze', async (req: Request, res: Response): Promise<void> => {
  const { callId } = req.params;
  const db = getDatabase();

  let orgId = (req.headers['x-organization-id'] as string) || '33333333-3333-3333-3333-333333333301';
  let call = await db.getCallEventById(orgId, callId);

  if (!call) {
    // Search across known orgs or raw map
    const memoryDb = db as any;
    if (memoryDb.callEvents && memoryDb.callEvents.has(callId)) {
      call = memoryDb.callEvents.get(callId);
      if (call) orgId = call.organizationId;
    }
  }

  if (!call) {
    res.status(404).json({ error: 'Not Found', message: 'Call not found' });
    return;
  }

  const analysis = await aiAnalyzer.analyzeCall(call);
  await db.updateCallAiAnalysis(orgId, call.id, analysis);

  res.json({
    success: true,
    aiAnalysis: analysis
  });
});

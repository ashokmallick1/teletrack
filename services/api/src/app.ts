import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes';
import { orgRouter } from './routes/org.routes';
import { employeeRouter } from './routes/employee.routes';
import { teamRouter } from './routes/team.routes';
import { deviceRouter } from './routes/device.routes';
import { callEventRouter } from './routes/call-event.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { leadRouter } from './routes/lead.routes';
import { followUpRouter } from './routes/follow-up.routes';
import { auditRouter } from './routes/audit.routes';
import { adminRouter } from './routes/admin.routes';
import { desktopRouter } from './routes/desktop.routes';
import { productivityRouter } from './routes/productivity.routes';
import { callRecordingRouter } from './routes/call-recording.routes';
import { campaignRouter } from './routes/campaign.routes';
import { whatsappRouter } from './routes/whatsapp.routes';
import { webhookRouter } from './routes/webhook.routes';
import { errorHandler } from './middleware/error';

import fs from 'fs';
import path from 'path';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: 'text/csv' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Direct binary downloads helper
  const publicDir = path.resolve(__dirname, '../../../apps/web/public');
  const serveBinary = (filename: string, mimeType: string) => (_req: any, res: any) => {
    const filePath = path.join(publicDir, filename);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } else {
      res.status(404).send(`${filename} not found`);
    }
  };

  app.get('/teletrack.apk', serveBinary('teletrack.apk', 'application/vnd.android.package-archive'));
  app.get('/api/v1/download/apk', serveBinary('teletrack.apk', 'application/vnd.android.package-archive'));
  app.get('/teletrack-desktop.zip', serveBinary('teletrack-desktop.zip', 'application/zip'));
  app.get('/teletrack-windows.zip', serveBinary('teletrack-windows.zip', 'application/zip'));
  app.get('/teletrack-mac.zip', serveBinary('teletrack-mac.zip', 'application/zip'));
  app.get('/teletrack-linux.tar.gz', serveBinary('teletrack-linux.tar.gz', 'application/gzip'));
  app.get('/api/v1/download/desktop/:os', (req, res) => {
    const os = (req.params.os || '').toLowerCase();
    if (os.includes('win')) return serveBinary('teletrack-windows.zip', 'application/zip')(req, res);
    if (os.includes('mac') || os.includes('darwin')) return serveBinary('teletrack-mac.zip', 'application/zip')(req, res);
    if (os.includes('linux')) return serveBinary('teletrack-linux.tar.gz', 'application/gzip')(req, res);
    return serveBinary('teletrack-desktop.zip', 'application/zip')(req, res);
  });

  // Health checks
  const healthHandler = (_req: any, res: any) => {
    res.json({
      status: 'healthy',
      service: 'teletrack-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // REST API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.get('/api/v1/me', (req, res, next) => {
    req.url = '/me';
    authRouter(req, res, next);
  });
  app.use('/api/v1/organizations', orgRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/teams', teamRouter);
  app.use('/api/v1/devices', deviceRouter);
  app.use('/api/v1/call-events', callEventRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/leads', leadRouter);
  app.use('/api/v1/follow-ups', followUpRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/desktop', desktopRouter);
  app.use('/api/v1/productivity', productivityRouter);
  app.use('/api/v1/call-recordings', callRecordingRouter);
  app.use('/api/v1/campaigns', campaignRouter);
  app.use('/api/v1/whatsapp', whatsappRouter);
  app.use('/api/v1/webhooks', webhookRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} not found`
    });
  });

  // Central error handler
  app.use(errorHandler);

  return app;
}

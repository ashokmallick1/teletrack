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

  // Direct APK download route with explicit package-archive MIME type
  const apkPath = path.resolve(__dirname, '../../../apps/web/public/callyzer.apk');
  const serveApk = (_req: any, res: any) => {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="callyzer.apk"');
      res.sendFile(apkPath);
    } else {
      res.status(404).send('APK file not found');
    }
  };
  app.get('/callyzer.apk', serveApk);
  app.get('/api/v1/download/apk', serveApk);

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'callyzer-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // REST API v1 Routes
  app.use('/api/v1/auth', authRouter);
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

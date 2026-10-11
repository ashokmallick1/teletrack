import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Callyzer Backend API Test Suite', () => {
  const app = createApp();
  let ownerToken: string;
  let callerToken: string;
  let orgBToken: string;
  const acmeOrgId = '33333333-3333-3333-3333-333333333301';
  const globalOrgId = '33333333-3333-3333-3333-333333333302';
  let deviceApiKey: string;
  let enrolledDeviceId: string;

  beforeAll(async () => {
    // 1. Login as Acme Org Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.token;

    // 2. Login as Acme Telecaller (Rahul)
    const callerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rahul@acme.com', password: 'Password123!' });
    expect(callerRes.status).toBe(200);
    callerToken = callerRes.body.token;

    // 3. Login as Org B Owner (David)
    const orgBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@globalconnect.com', password: 'Password123!' });
    expect(orgBRes.status).toBe(200);
    orgBToken = orgBRes.body.token;
  });

  describe('1. Health and Authentication', () => {
    it('GET /api/v1/health returns healthy', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('POST /api/v1/auth/login fails on invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'owner@acme.com', password: 'WrongPassword' });
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/auth/me returns current user profile and memberships', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('owner@acme.com');
      expect(res.body.memberships.length).toBeGreaterThan(0);
    });
  });

  describe('2. Multi-Tenancy and Authorization Enforcement', () => {
    it('Denies access when Org B owner attempts to access Org A data', async () => {
      const res = await request(app)
        .get('/api/v1/call-events')
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('x-organization-id', acmeOrgId);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not a member of this organization');
    });

    it('Allows Org A owner to query Org A call events', async () => {
      const res = await request(app)
        .get('/api/v1/call-events')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('3. Device Lifecycle and Enrollment', () => {
    it('Owner generates enrollment token for telecaller', async () => {
      const res = await request(app)
        .post('/api/v1/devices/enrollment-token')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId)
        .send({ employeeId: '66666666-6666-6666-6666-666666666603' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      // Device registers using the token
      const enrollRes = await request(app)
        .post('/api/v1/devices/enroll')
        .send({
          enrollmentToken: res.body.token,
          deviceIdentifier: 'android-hw-unit-test-uuid',
          deviceName: 'Pixel 8 Test Device',
          model: 'Pixel 8',
          manufacturer: 'Google',
          osVersion: 'Android 15 (API 35)',
          appVersion: '1.0.0',
          permissionGranted: true,
          simMetadata: { carrierName: 'Jio 5G', simCount: 1 }
        });

      expect(enrollRes.status).toBe(201);
      expect(enrollRes.body.deviceApiKey).toBeDefined();
      expect(enrollRes.body.deviceId).toBeDefined();
      deviceApiKey = enrollRes.body.deviceApiKey;
      enrolledDeviceId = enrollRes.body.deviceId;
    });

    it('Fails to reuse the same enrollment token twice', async () => {
      const res = await request(app)
        .post('/api/v1/devices/enroll')
        .send({
          enrollmentToken: 'EXPIRED-OR-REUSED',
          deviceIdentifier: 'android-hw-2',
          deviceName: 'Device 2',
          model: 'M',
          manufacturer: 'M',
          osVersion: '14',
          appVersion: '1.0',
          permissionGranted: true
        });
      expect(res.status).toBe(401);
    });
  });

  describe('4. Call Event Ingestion and Deduplication', () => {
    const testCallId = `test_synthetic_call_${Date.now()}`;

    it('Ingests batch of call events via device API key', async () => {
      const payload = {
        clientTimestamp: new Date().toISOString(),
        events: [
          {
            sourceCallId: testCallId,
            direction: 'OUTGOING',
            durationSeconds: 185,
            startedAt: new Date().toISOString(),
            endedAt: new Date(Date.now() + 185000).toISOString(),
            outcome: 'ANSWERED',
            phoneNumber: '+919822011223', // Matches Lead Anand Kulkarni
            simSlot: 0,
            simCarrier: 'Jio 5G',
            dataSource: 'NATIVE_CALL_LOG'
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/call-events/batch')
        .set('x-device-api-key', deviceApiKey)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.inserted).toBe(1);
      expect(res.body.duplicates).toBe(0);
      expect(res.body.batchId).toBeDefined();
    });

    it('Re-submitting duplicate event does not create redundant record', async () => {
      const payload = {
        clientTimestamp: new Date().toISOString(),
        events: [
          {
            sourceCallId: testCallId, // Same ID
            direction: 'OUTGOING',
            durationSeconds: 185,
            startedAt: new Date().toISOString(),
            outcome: 'ANSWERED',
            phoneNumber: '+919822011223',
            dataSource: 'NATIVE_CALL_LOG'
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/call-events/batch')
        .set('x-device-api-key', deviceApiKey)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.inserted).toBe(0);
      expect(res.body.duplicates).toBe(1);
    });

    it('Updated lead metrics after call ingestion', async () => {
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);

      expect(res.status).toBe(200);
      const lead = res.body.data.find((l: any) => l.phoneNumber.includes('9822011223'));
      expect(lead).toBeDefined();
      expect(lead.totalCallsCount).toBeGreaterThan(0);
    });
  });

  describe('5. Analytics and Reporting', () => {
    it('GET /api/v1/analytics/overview returns aggregated metrics', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);

      expect(res.status).toBe(200);
      expect(res.body.totalCalls).toBeGreaterThan(0);
      expect(res.body.answeredCalls).toBeGreaterThan(0);
      expect(res.body.avgConnectedDurationSeconds).toBeGreaterThan(0);
    });

    it('GET /api/v1/analytics/calls returns daily trends', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/calls')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/analytics/sync-health returns devices health', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sync-health')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].syncStatus).toBeDefined();
    });

    it('GET /api/v1/call-events/export/csv produces valid CSV stream', async () => {
      const res = await request(app)
        .get('/api/v1/call-events/export/csv')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Event ID');
      expect(res.text).toContain('Direction');
    });
  });

  describe('6. Leads and Notes Management', () => {
    let createdLeadId: string;

    it('Creates a new lead', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId)
        .send({
          name: 'Kavita Nair',
          phoneNumber: '+919988776655',
          company: 'Nair Logistics',
          status: 'NEW'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Kavita Nair');
      createdLeadId = res.body.id;
    });

    it('Adds a note to the lead', async () => {
      const res = await request(app)
        .post(`/api/v1/leads/${createdLeadId}/notes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-organization-id', acmeOrgId)
        .send({ note: 'Initial telephonic discussion completed' });

      expect(res.status).toBe(201);
      expect(res.body.note).toContain('telephonic');
    });
  });
});

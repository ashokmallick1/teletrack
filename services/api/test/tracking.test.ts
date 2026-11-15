import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Field Tracking & TrackHR API Test Suite', () => {
  const app = createApp();
  let ownerToken: string;
  let callerToken: string;
  const orgId = '33333333-3333-3333-3333-333333333301';
  const rahulEmpId = '66666666-6666-6666-6666-666666666603';

  beforeAll(async () => {
    const ownerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.token;

    const callerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rahul@acme.com', password: 'Password123!' });
    expect(callerRes.status).toBe(200);
    callerToken = callerRes.body.token;
  });

  it('GET /api/v1/tracking/live returns live agents and summary', async () => {
    const res = await request(app)
      .get('/api/v1/tracking/live')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agents).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(Array.isArray(res.body.data.agents)).toBe(true);
  });

  it('GET /api/v1/tracking/summary returns field metrics', async () => {
    const res = await request(app)
      .get('/api/v1/tracking/summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalFieldAgents).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalDistanceTraveledKm).toBeDefined();
  });

  it('POST /api/v1/tracking/attendance/check-in records punch-in', async () => {
    const res = await request(app)
      .post('/api/v1/tracking/attendance/check-in')
      .set('Authorization', `Bearer ${callerToken}`)
      .set('x-organization-id', orgId)
      .send({
        employeeId: rahulEmpId,
        latitude: 12.9344,
        longitude: 77.6190,
        address: 'Koramangala 4th Block, Bengaluru',
        batteryLevel: 94,
        isMock: false,
        remarks: 'Morning field shift started'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CHECKED_IN');
    expect(res.body.data.checkInLat).toBe(12.9344);
  });

  it('POST /api/v1/tracking/location/ping ingests a GPS breadcrumb', async () => {
    const res = await request(app)
      .post('/api/v1/tracking/location/ping')
      .set('Authorization', `Bearer ${callerToken}`)
      .set('x-organization-id', orgId)
      .send({
        employeeId: rahulEmpId,
        latitude: 12.9610,
        longitude: 77.6387,
        speed: 38.5,
        heading: 45,
        batteryLevel: 92,
        isMockLocation: false,
        address: 'Domlur Flyover, Bengaluru'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inserted).toBe(1);
  });

  it('POST /api/v1/tracking/visits logs a client meeting', async () => {
    const res = await request(app)
      .post('/api/v1/tracking/visits')
      .set('Authorization', `Bearer ${callerToken}`)
      .set('x-organization-id', orgId)
      .send({
        employeeId: rahulEmpId,
        clientName: 'Sunil Nair',
        companyName: 'Apex Cloud Solutions',
        latitude: 12.9784,
        longitude: 77.6408,
        address: '100ft Road, Indiranagar',
        outcome: 'INTERESTED',
        notes: 'Requested proposal for 25 licenses',
        durationMinutes: 45
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clientName).toBe('Sunil Nair');
    expect(res.body.data.outcome).toBe('INTERESTED');
  });

  it('GET /api/v1/tracking/route/:employeeId returns route replay data', async () => {
    const res = await request(app)
      .get(`/api/v1/tracking/route/${rahulEmpId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pings.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalDistanceKm).toBeDefined();
  });

  it('POST /api/v1/tracking/attendance/check-out calculates shift duration and distance', async () => {
    const res = await request(app)
      .post('/api/v1/tracking/attendance/check-out')
      .set('Authorization', `Bearer ${callerToken}`)
      .set('x-organization-id', orgId)
      .send({
        employeeId: rahulEmpId,
        latitude: 12.9125,
        longitude: 77.6440,
        address: 'HSR Layout Sector 1 Hub',
        batteryLevel: 32,
        isMock: false,
        remarks: 'Field meetings completed. Shift closed.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CHECKED_OUT');
    expect(res.body.data.totalDurationMinutes).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/tracking/attendance/history returns complete shift records', async () => {
    const res = await request(app)
      .get('/api/v1/tracking/attendance/history')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

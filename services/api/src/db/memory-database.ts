import crypto from 'crypto';
import {
  UserProfile,
  Organization,
  OrganizationMembership,
  Team,
  Device,
  CallEvent,
  SyncBatch,
  Lead,
  LeadNote,
  FollowUpTask,
  AuditLog,
  SubscriptionPlan,
  OrganizationSubscription,
  UserRole,
  CallDirection,
  CallOutcome,
  DataSource,
  DeviceStatus,
  SyncStatus,
  LeadStatus,
  AnalyticsOverview,
  DailyCallTrend,
  EmployeePerformance,
  DeviceSyncHealth,
  PaginatedResult
} from '@callyzer/shared-types';
import { IDatabase } from './types';

export class MemoryDatabase implements IDatabase {
  public profiles: Map<string, UserProfile & { passwordHash?: string }> = new Map();
  public organizations: Map<string, Organization> = new Map();
  public teams: Map<string, Team> = new Map();
  public memberships: Map<string, OrganizationMembership> = new Map();
  public devices: Map<string, Device> = new Map();
  public deviceSessions: Map<string, { deviceId: string; apiKeyHash: string; expiresAt: Date; revokedAt?: Date }> = new Map();
  public enrollmentTokens: Map<string, { organizationId: string; employeeId: string; tokenHash: string; expiresAt: Date; usedAt?: Date }> = new Map();
  public callEvents: Map<string, CallEvent> = new Map();
  public syncBatches: Map<string, SyncBatch> = new Map();
  public leads: Map<string, Lead> = new Map();
  public leadNotes: Map<string, LeadNote> = new Map();
  public followUps: Map<string, FollowUpTask> = new Map();
  public auditLogs: AuditLog[] = [];
  public subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  public organizationSubscriptions: Map<string, OrganizationSubscription> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // 1. Subscription Plans
    const starterPlan: SubscriptionPlan = {
      id: '11111111-1111-1111-1111-111111111101',
      name: 'Starter',
      code: 'STARTER',
      maxDevices: 5,
      maxEmployees: 5,
      retentionDays: 30,
      priceMonthly: 29.00,
      features: ['basic_analytics', 'device_management', 'csv_export']
    };
    const proPlan: SubscriptionPlan = {
      id: '11111111-1111-1111-1111-111111111102',
      name: 'Professional',
      code: 'PRO',
      maxDevices: 25,
      maxEmployees: 30,
      retentionDays: 90,
      priceMonthly: 99.00,
      features: ['advanced_analytics', 'lead_management', 'realtime_sync', 'csv_import_export', 'audit_logs']
    };
    this.subscriptionPlans.set(starterPlan.id, starterPlan);
    this.subscriptionPlans.set(proPlan.id, proPlan);

    // 2. Profiles (Password: Password123! hashed)
    // bcrypt hash for Password123!
    const defaultPasswordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    const superAdmin: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222200',
      email: 'superadmin@callyzer.io',
      fullName: 'Platform Super Admin',
      isSuperAdmin: true,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const orgOwner: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222201',
      email: 'owner@acme.com',
      fullName: 'Rajesh Sharma',
      isSuperAdmin: false,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const manager: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222202',
      email: 'manager@acme.com',
      fullName: 'Priya Patel',
      isSuperAdmin: false,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const caller1: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222203',
      email: 'rahul@acme.com',
      fullName: 'Rahul Verma',
      isSuperAdmin: false,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const caller2: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222204',
      email: 'sneha@acme.com',
      fullName: 'Sneha Rao',
      isSuperAdmin: false,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const orgBOwner: UserProfile & { passwordHash?: string } = {
      id: '22222222-2222-2222-2222-222222222205',
      email: 'owner@globalconnect.com',
      fullName: 'David Miller',
      isSuperAdmin: false,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    [superAdmin, orgOwner, manager, caller1, caller2, orgBOwner].forEach(p => this.profiles.set(p.id, p));

    // 3. Organizations
    const acmeOrg: Organization = {
      id: '33333333-3333-3333-3333-333333333301',
      name: 'Acme TeleServices Pvt Ltd',
      slug: 'acme-teleservices',
      timezone: 'Asia/Kolkata',
      retentionDays: 90,
      maskPhoneNumbers: false,
      maxDevices: 25,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    const globalOrg: Organization = {
      id: '33333333-3333-3333-3333-333333333302',
      name: 'Global Connect Logistics',
      slug: 'global-connect',
      timezone: 'America/New_York',
      retentionDays: 60,
      maskPhoneNumbers: true,
      maxDevices: 10,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.organizations.set(acmeOrg.id, acmeOrg);
    this.organizations.set(globalOrg.id, globalOrg);

    // 4. Teams
    const outboundTeam: Team = {
      id: '55555555-5555-5555-5555-555555555501',
      organizationId: acmeOrg.id,
      name: 'Outbound Sales',
      description: 'Cold outreach and lead follow-ups',
      memberCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const inboundTeam: Team = {
      id: '55555555-5555-5555-5555-555555555502',
      organizationId: acmeOrg.id,
      name: 'Inbound Support',
      description: 'Incoming queries and renewals',
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.teams.set(outboundTeam.id, outboundTeam);
    this.teams.set(inboundTeam.id, inboundTeam);

    // 5. Memberships
    const mOwner: OrganizationMembership = {
      id: '66666666-6666-6666-6666-666666666601',
      organizationId: acmeOrg.id,
      userId: orgOwner.id,
      role: 'ORG_OWNER',
      employeeCode: 'EMP-001',
      isActive: true,
      user: orgOwner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const mManager: OrganizationMembership = {
      id: '66666666-6666-6666-6666-666666666602',
      organizationId: acmeOrg.id,
      userId: manager.id,
      role: 'MANAGER',
      teamId: outboundTeam.id,
      employeeCode: 'EMP-002',
      isActive: true,
      user: manager,
      team: outboundTeam,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const mCaller1: OrganizationMembership = {
      id: '66666666-6666-6666-6666-666666666603',
      organizationId: acmeOrg.id,
      userId: caller1.id,
      role: 'EMPLOYEE',
      teamId: outboundTeam.id,
      employeeCode: 'EMP-003',
      isActive: true,
      user: caller1,
      team: outboundTeam,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const mCaller2: OrganizationMembership = {
      id: '66666666-6666-6666-6666-666666666604',
      organizationId: acmeOrg.id,
      userId: caller2.id,
      role: 'EMPLOYEE',
      teamId: inboundTeam.id,
      employeeCode: 'EMP-004',
      isActive: true,
      user: caller2,
      team: inboundTeam,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const mBOwner: OrganizationMembership = {
      id: '66666666-6666-6666-6666-666666666605',
      organizationId: globalOrg.id,
      userId: orgBOwner.id,
      role: 'ORG_OWNER',
      employeeCode: 'GC-001',
      isActive: true,
      user: orgBOwner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    [mOwner, mManager, mCaller1, mCaller2, mBOwner].forEach(m => this.memberships.set(m.id, m));

    // 6. Devices
    const dev1: Device = {
      id: '77777777-7777-7777-7777-777777777701',
      organizationId: acmeOrg.id,
      employeeId: mCaller1.id,
      deviceIdentifier: 'device-android-rahul-01',
      deviceName: 'Samsung Galaxy M34 (Rahul)',
      model: 'SM-M346B',
      manufacturer: 'Samsung',
      osVersion: 'Android 14 (API 34)',
      appVersion: '1.0.0',
      status: 'ACTIVE',
      lastContactAt: new Date(Date.now() - 5 * 60000).toISOString(),
      lastSyncAt: new Date(Date.now() - 5 * 60000).toISOString(),
      pendingEventsCount: 0,
      permissionGranted: true,
      simMetadata: { carrierName: 'Jio 5G', simCount: 2, phoneAccountHandle: 'sim_0' },
      employee: { id: mCaller1.id, fullName: caller1.fullName, email: caller1.email, role: mCaller1.role },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const dev2: Device = {
      id: '77777777-7777-7777-7777-777777777702',
      organizationId: acmeOrg.id,
      employeeId: mCaller2.id,
      deviceIdentifier: 'device-android-sneha-02',
      deviceName: 'Redmi Note 13 Pro (Sneha)',
      model: '2312DRA50G',
      manufacturer: 'Xiaomi',
      osVersion: 'Android 14 (API 34)',
      appVersion: '1.0.0',
      status: 'ACTIVE',
      lastContactAt: new Date(Date.now() - 15 * 60000).toISOString(),
      lastSyncAt: new Date(Date.now() - 15 * 60000).toISOString(),
      pendingEventsCount: 0,
      permissionGranted: true,
      simMetadata: { carrierName: 'Airtel', simCount: 1, phoneAccountHandle: 'sim_0' },
      employee: { id: mCaller2.id, fullName: caller2.fullName, email: caller2.email, role: mCaller2.role },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.devices.set(dev1.id, dev1);
    this.devices.set(dev2.id, dev2);

    // Device API key for demo: 'dev_api_key_rahul_demo_12345678'
    const demoApiKeyHash = crypto.createHash('sha256').update('dev_api_key_rahul_demo_12345678').digest('hex');
    this.deviceSessions.set('session_dev1', {
      deviceId: dev1.id,
      apiKeyHash: demoApiKeyHash,
      expiresAt: new Date(Date.now() + 365 * 86400000)
    });

    // 7. Leads
    const lead1: Lead = {
      id: '99999999-9999-9999-9999-999999999901',
      organizationId: acmeOrg.id,
      assignedEmployeeId: mCaller1.id,
      name: 'Anand Kulkarni',
      phoneNumber: '+919822011223',
      email: 'anand@techcraft.in',
      company: 'Techcraft Solutions',
      status: 'QUALIFIED',
      source: 'Website',
      followUpAt: new Date(Date.now() + 86400000).toISOString(),
      lastContactedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      notesCount: 2,
      totalCallsCount: 2,
      totalDurationSeconds: 805,
      assignedEmployee: { id: mCaller1.id, fullName: caller1.fullName, email: caller1.email },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const lead2: Lead = {
      id: '99999999-9999-9999-9999-999999999902',
      organizationId: acmeOrg.id,
      assignedEmployeeId: mCaller1.id,
      name: 'Meera Singhania',
      phoneNumber: '+919876543210',
      email: 'meera@singhania.com',
      company: 'Singhania Exports',
      status: 'CONTACTED',
      source: 'Cold Call',
      followUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      lastContactedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      notesCount: 1,
      totalCallsCount: 1,
      totalDurationSeconds: 0,
      assignedEmployee: { id: mCaller1.id, fullName: caller1.fullName, email: caller1.email },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const lead3: Lead = {
      id: '99999999-9999-9999-9999-999999999903',
      organizationId: acmeOrg.id,
      assignedEmployeeId: mCaller2.id,
      name: 'Vikram Seth',
      phoneNumber: '+919811122233',
      email: 'vikram@sethenterprises.in',
      company: 'Seth Enterprises',
      status: 'NEW',
      source: 'Referral',
      followUpAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      notesCount: 0,
      totalCallsCount: 1,
      totalDurationSeconds: 122,
      assignedEmployee: { id: mCaller2.id, fullName: caller2.fullName, email: caller2.email },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead1.id, lead1);
    this.leads.set(lead2.id, lead2);
    this.leads.set(lead3.id, lead3);

    // 8. Lead Notes
    const note1: LeadNote = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      leadId: lead1.id,
      organizationId: acmeOrg.id,
      authorId: caller1.id,
      note: 'Spoke regarding 50 user package. Requested quote breakdown.',
      authorName: caller1.fullName,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    };
    const note2: LeadNote = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      leadId: lead1.id,
      organizationId: acmeOrg.id,
      authorId: caller1.id,
      note: 'Sent demo presentation. Scheduled follow-up call tomorrow.',
      authorName: caller1.fullName,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    };
    this.leadNotes.set(note1.id, note1);
    this.leadNotes.set(note2.id, note2);

    // 9. Follow Ups
    const fu1: FollowUpTask = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      leadId: lead1.id,
      organizationId: acmeOrg.id,
      assignedEmployeeId: mCaller1.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      title: 'Follow up on Enterprise Proposal',
      notes: 'Discuss discount tier for 50 licenses',
      isCompleted: false,
      leadName: lead1.name,
      leadPhone: lead1.phoneNumber,
      assignedEmployeeName: caller1.fullName,
      createdAt: new Date().toISOString()
    };
    this.followUps.set(fu1.id, fu1);

    // 10. Call Events (Realistic synthetic calls)
    const calls: CallEvent[] = [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0001',
        organizationId: acmeOrg.id,
        deviceId: dev1.id,
        employeeId: mCaller1.id,
        sourceCallId: 'call_log_1001',
        direction: 'OUTGOING',
        durationSeconds: 245,
        startedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        endedAt: new Date(Date.now() - 2 * 3600000 + 245000).toISOString(),
        outcome: 'ANSWERED',
        outcomeConfidence: 1.0,
        rawPhoneNumber: '+919822011223',
        displayPhoneNumber: '+919822011223',
        simSlot: 0,
        simCarrier: 'Jio 5G',
        phoneAccount: 'sim_0',
        leadId: lead1.id,
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller1.fullName,
        deviceName: dev1.deviceName,
        teamName: outboundTeam.name,
        leadName: lead1.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0002',
        organizationId: acmeOrg.id,
        deviceId: dev1.id,
        employeeId: mCaller1.id,
        sourceCallId: 'call_log_1002',
        direction: 'MISSED',
        durationSeconds: 0,
        startedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        outcome: 'MISSED',
        outcomeConfidence: 1.0,
        rawPhoneNumber: '+919876543210',
        displayPhoneNumber: '+919876543210',
        simSlot: 0,
        simCarrier: 'Jio 5G',
        phoneAccount: 'sim_0',
        leadId: lead2.id,
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller1.fullName,
        deviceName: dev1.deviceName,
        teamName: outboundTeam.name,
        leadName: lead2.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
        organizationId: acmeOrg.id,
        deviceId: dev1.id,
        employeeId: mCaller1.id,
        sourceCallId: 'call_log_1003',
        direction: 'OUTGOING',
        durationSeconds: 0,
        startedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        outcome: 'REJECTED',
        outcomeConfidence: 0.9,
        rawPhoneNumber: '+919899001122',
        displayPhoneNumber: '+919899001122',
        simSlot: 0,
        simCarrier: 'Jio 5G',
        phoneAccount: 'sim_0',
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller1.fullName,
        deviceName: dev1.deviceName,
        teamName: outboundTeam.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0004',
        organizationId: acmeOrg.id,
        deviceId: dev2.id,
        employeeId: mCaller2.id,
        sourceCallId: 'call_log_2001',
        direction: 'INCOMING',
        durationSeconds: 380,
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        endedAt: new Date(Date.now() - 86400000 + 380000).toISOString(),
        outcome: 'ANSWERED',
        outcomeConfidence: 1.0,
        rawPhoneNumber: '+919944556677',
        displayPhoneNumber: '+919944556677',
        simSlot: 0,
        simCarrier: 'Airtel',
        phoneAccount: 'sim_0',
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller2.fullName,
        deviceName: dev2.deviceName,
        teamName: inboundTeam.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0005',
        organizationId: acmeOrg.id,
        deviceId: dev2.id,
        employeeId: mCaller2.id,
        sourceCallId: 'call_log_2002',
        direction: 'OUTGOING',
        durationSeconds: 122,
        startedAt: new Date(Date.now() - 86400000 - 7200000).toISOString(),
        endedAt: new Date(Date.now() - 86400000 - 7200000 + 122000).toISOString(),
        outcome: 'ANSWERED',
        outcomeConfidence: 1.0,
        rawPhoneNumber: '+919811122233',
        displayPhoneNumber: '+919811122233',
        simSlot: 0,
        simCarrier: 'Airtel',
        phoneAccount: 'sim_0',
        leadId: lead3.id,
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller2.fullName,
        deviceName: dev2.deviceName,
        teamName: inboundTeam.name,
        leadName: lead3.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0006',
        organizationId: acmeOrg.id,
        deviceId: dev1.id,
        employeeId: mCaller1.id,
        sourceCallId: 'call_log_1004',
        direction: 'OUTGOING',
        durationSeconds: 0,
        startedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        outcome: 'BUSY',
        outcomeConfidence: 0.95,
        rawPhoneNumber: '+919123456789',
        displayPhoneNumber: '+919123456789',
        simSlot: 0,
        simCarrier: 'Jio 5G',
        phoneAccount: 'sim_0',
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller1.fullName,
        deviceName: dev1.deviceName,
        teamName: outboundTeam.name,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccc0007',
        organizationId: acmeOrg.id,
        deviceId: dev1.id,
        employeeId: mCaller1.id,
        sourceCallId: 'call_log_1005',
        direction: 'OUTGOING',
        durationSeconds: 560,
        startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        endedAt: new Date(Date.now() - 3 * 86400000 + 560000).toISOString(),
        outcome: 'ANSWERED',
        outcomeConfidence: 1.0,
        rawPhoneNumber: '+919822011223',
        displayPhoneNumber: '+919822011223',
        simSlot: 0,
        simCarrier: 'Jio 5G',
        phoneAccount: 'sim_0',
        leadId: lead1.id,
        dataSource: 'NATIVE_CALL_LOG',
        employeeName: caller1.fullName,
        deviceName: dev1.deviceName,
        teamName: outboundTeam.name,
        leadName: lead1.name,
        createdAt: new Date().toISOString()
      }
    ];

    calls.forEach(c => this.callEvents.set(c.id, c));

    // Audit logs
    this.auditLogs.push({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      organizationId: acmeOrg.id,
      actorId: orgOwner.id,
      action: 'ORGANIZATION_INITIALIZED',
      resourceType: 'organizations',
      resourceId: acmeOrg.id,
      actorName: orgOwner.fullName,
      actorEmail: orgOwner.email,
      details: { plan: 'Professional' },
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    });
  }

  // Profiles
  async findProfileByEmail(email: string): Promise<(UserProfile & { passwordHash?: string }) | null> {
    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase() === email.toLowerCase()) return { ...p };
    }
    return null;
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    const p = this.profiles.get(id);
    if (!p) return null;
    const { passwordHash, ...clean } = p;
    return { ...clean };
  }

  async createProfile(data: Partial<UserProfile> & { email: string; fullName: string; passwordHash: string }): Promise<UserProfile> {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const profile: UserProfile & { passwordHash?: string } = {
      id,
      email: data.email,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      phone: data.phone,
      isSuperAdmin: false,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now
    };
    this.profiles.set(id, profile);
    const { passwordHash, ...clean } = profile;
    return clean;
  }

  // Organizations & Memberships
  async getUserMemberships(userId: string): Promise<OrganizationMembership[]> {
    const list: OrganizationMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.isActive) {
        const org = this.organizations.get(m.organizationId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        list.push({ ...m, team });
      }
    }
    return list;
  }

  async getOrganizationById(orgId: string): Promise<Organization | null> {
    return this.organizations.get(orgId) ? { ...this.organizations.get(orgId)! } : null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    for (const o of this.organizations.values()) {
      if (o.slug === slug) return { ...o };
    }
    return null;
  }

  async createOrganization(data: { name: string; slug: string; timezone?: string }): Promise<Organization> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const org: Organization = {
      id,
      name: data.name,
      slug: data.slug,
      timezone: data.timezone || 'UTC',
      retentionDays: 90,
      maskPhoneNumbers: false,
      maxDevices: 10,
      createdAt: now,
      updatedAt: now
    };
    this.organizations.set(id, org);
    return { ...org };
  }

  async updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error('Organization not found');
    const updated = { ...org, ...data, updatedAt: new Date().toISOString() };
    this.organizations.set(orgId, updated);
    return { ...updated };
  }

  async getOrgMembers(orgId: string): Promise<OrganizationMembership[]> {
    const list: OrganizationMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.organizationId === orgId && m.isActive) {
        const user = await this.findProfileById(m.userId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        list.push({ ...m, user: user || undefined, team });
      }
    }
    return list;
  }

  async getMembership(orgId: string, userId: string): Promise<OrganizationMembership | null> {
    for (const m of this.memberships.values()) {
      if (m.organizationId === orgId && m.userId === userId && m.isActive) {
        const user = await this.findProfileById(m.userId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        return { ...m, user: user || undefined, team };
      }
    }
    return null;
  }

  async createMembership(data: { organizationId: string; userId: string; role: UserRole; teamId?: string; employeeCode?: string }): Promise<OrganizationMembership> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = await this.findProfileById(data.userId);
    const team = data.teamId ? this.teams.get(data.teamId) : undefined;
    const m: OrganizationMembership = {
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role,
      teamId: data.teamId,
      employeeCode: data.employeeCode,
      isActive: true,
      user: user || undefined,
      team,
      createdAt: now,
      updatedAt: now
    };
    this.memberships.set(id, m);
    return { ...m };
  }

  // Teams
  async getTeams(orgId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(t => t.organizationId === orgId);
  }

  async createTeam(data: { organizationId: string; name: string; description?: string }): Promise<Team> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const team: Team = {
      id,
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      memberCount: 0,
      createdAt: now,
      updatedAt: now
    };
    this.teams.set(id, team);
    return { ...team };
  }

  // Devices & Sessions
  async getDevices(orgId: string): Promise<Device[]> {
    const list: Device[] = [];
    for (const d of this.devices.values()) {
      if (d.organizationId === orgId) {
        const member = this.memberships.get(d.employeeId);
        const user = member ? this.profiles.get(member.userId) : undefined;
        list.push({
          ...d,
          employee: member && user ? {
            id: member.id,
            fullName: user.fullName,
            email: user.email,
            role: member.role
          } : undefined
        });
      }
    }
    return list;
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    const d = this.devices.get(deviceId);
    if (!d) return null;
    const member = this.memberships.get(d.employeeId);
    const user = member ? this.profiles.get(member.userId) : undefined;
    return {
      ...d,
      employee: member && user ? {
        id: member.id,
        fullName: user.fullName,
        email: user.email,
        role: member.role
      } : undefined
    };
  }

  async getDeviceByIdentifier(orgId: string, deviceIdentifier: string): Promise<Device | null> {
    for (const d of this.devices.values()) {
      if (d.organizationId === orgId && d.deviceIdentifier === deviceIdentifier) {
        return { ...d };
      }
    }
    return null;
  }

  async createEnrollmentToken(orgId: string, employeeId: string, tokenHash: string, expiresAt: Date): Promise<string> {
    const id = crypto.randomUUID();
    this.enrollmentTokens.set(tokenHash, {
      organizationId: orgId,
      employeeId,
      tokenHash,
      expiresAt
    });
    return id;
  }

  async verifyAndConsumeEnrollmentToken(tokenHash: string): Promise<{ organizationId: string; employeeId: string } | null> {
    const token = this.enrollmentTokens.get(tokenHash);
    if (!token) return null;
    if (token.usedAt || token.expiresAt < new Date()) return null;
    token.usedAt = new Date();
    return { organizationId: token.organizationId, employeeId: token.employeeId };
  }

  async registerDevice(data: {
    organizationId: string;
    employeeId: string;
    deviceIdentifier: string;
    deviceName: string;
    model: string;
    manufacturer: string;
    osVersion: string;
    appVersion: string;
    permissionGranted: boolean;
    simMetadata?: any;
  }): Promise<Device> {
    const existing = await this.getDeviceByIdentifier(data.organizationId, data.deviceIdentifier);
    const now = new Date().toISOString();
    const id = existing ? existing.id : crypto.randomUUID();
    const device: Device = {
      id,
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      deviceIdentifier: data.deviceIdentifier,
      deviceName: data.deviceName,
      model: data.model,
      manufacturer: data.manufacturer,
      osVersion: data.osVersion,
      appVersion: data.appVersion,
      status: 'ACTIVE',
      lastContactAt: now,
      lastSyncAt: now,
      permissionGranted: data.permissionGranted,
      simMetadata: data.simMetadata,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    this.devices.set(id, device);
    return { ...device };
  }

  async createDeviceSession(deviceId: string, apiKeyHash: string, expiresAt: Date): Promise<void> {
    this.deviceSessions.set(apiKeyHash, {
      deviceId,
      apiKeyHash,
      expiresAt
    });
  }

  async findDeviceByApiKeyHash(apiKeyHash: string): Promise<Device | null> {
    const session = this.deviceSessions.get(apiKeyHash);
    if (!session || (session.revokedAt) || session.expiresAt < new Date()) {
      return null;
    }
    const device = this.devices.get(session.deviceId);
    if (!device || device.status === 'REVOKED') return null;
    const member = this.memberships.get(device.employeeId);
    const user = member ? this.profiles.get(member.userId) : undefined;
    return {
      ...device,
      employee: member && user ? {
        id: member.id,
        fullName: user.fullName,
        email: user.email,
        role: member.role
      } : undefined
    };
  }

  async updateDeviceSync(deviceId: string, permissionGranted?: boolean): Promise<void> {
    const d = this.devices.get(deviceId);
    if (d) {
      d.lastContactAt = new Date().toISOString();
      d.lastSyncAt = new Date().toISOString();
      if (permissionGranted !== undefined) d.permissionGranted = permissionGranted;
      d.updatedAt = new Date().toISOString();
    }
  }

  async revokeDevice(deviceId: string): Promise<boolean> {
    const d = this.devices.get(deviceId);
    if (!d) return false;
    d.status = 'REVOKED';
    d.updatedAt = new Date().toISOString();
    for (const s of this.deviceSessions.values()) {
      if (s.deviceId === deviceId) {
        s.revokedAt = new Date();
      }
    }
    return true;
  }

  // Call Events & Sync Batches
  async createSyncBatch(batch: {
    id: string;
    organizationId: string;
    deviceId: string;
    receivedCount: number;
    insertedCount: number;
    duplicateCount: number;
    errorCount: number;
    status: SyncStatus;
    clientTimestamp: Date;
    errorMessage?: string;
  }): Promise<SyncBatch> {
    const sb: SyncBatch = {
      id: batch.id,
      organizationId: batch.organizationId,
      deviceId: batch.deviceId,
      receivedCount: batch.receivedCount,
      insertedCount: batch.insertedCount,
      duplicateCount: batch.duplicateCount,
      errorCount: batch.errorCount,
      status: batch.status,
      clientTimestamp: batch.clientTimestamp.toISOString(),
      serverTimestamp: new Date().toISOString(),
      errorMessage: batch.errorMessage
    };
    this.syncBatches.set(sb.id, sb);
    return { ...sb };
  }

  async ingestCallEvents(
    orgId: string,
    deviceId: string,
    employeeId: string,
    batchId: string,
    events: Array<{
      sourceCallId: string;
      direction: CallDirection;
      durationSeconds: number;
      startedAt: Date;
      endedAt?: Date;
      outcome: CallOutcome;
      outcomeConfidence: number;
      rawPhoneNumber: string;
      simSlot?: number;
      simCarrier?: string;
      phoneAccount?: string;
      dataSource: DataSource;
      metadata?: any;
    }>
  ): Promise<{ inserted: number; duplicates: number; errors: number }> {
    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    const device = this.devices.get(deviceId);
    const membership = this.memberships.get(employeeId);
    const user = membership ? this.profiles.get(membership.userId) : undefined;
    const team = membership?.teamId ? this.teams.get(membership.teamId) : undefined;

    for (const evt of events) {
      try {
        // Composite uniqueness check: (organizationId, deviceId, sourceCallId)
        const duplicateKey = `${orgId}_${deviceId}_${evt.sourceCallId}`;
        const isDuplicate = Array.from(this.callEvents.values()).some(
          c => c.organizationId === orgId && c.deviceId === deviceId && c.sourceCallId === evt.sourceCallId
        );

        if (isDuplicate) {
          duplicates++;
          continue;
        }

        // Automatic matching to organization lead by phone number
        const lead = await this.findLeadByPhone(orgId, evt.rawPhoneNumber);

        const id = crypto.randomUUID();
        const callEvent: CallEvent = {
          id,
          organizationId: orgId,
          deviceId,
          employeeId,
          sourceCallId: evt.sourceCallId,
          direction: evt.direction,
          durationSeconds: evt.durationSeconds,
          startedAt: evt.startedAt.toISOString(),
          endedAt: evt.endedAt?.toISOString(),
          outcome: evt.outcome,
          outcomeConfidence: evt.outcomeConfidence || 1.0,
          rawPhoneNumber: evt.rawPhoneNumber,
          displayPhoneNumber: evt.rawPhoneNumber,
          simSlot: evt.simSlot,
          simCarrier: evt.simCarrier,
          phoneAccount: evt.phoneAccount,
          leadId: lead?.id,
          dataSource: evt.dataSource,
          syncBatchId: batchId,
          metadata: evt.metadata,
          employeeName: user?.fullName,
          deviceName: device?.deviceName,
          teamName: team?.name,
          leadName: lead?.name,
          createdAt: new Date().toISOString()
        };

        this.callEvents.set(id, callEvent);
        inserted++;

        // Update lead metrics if matched
        if (lead) {
          lead.lastContactedAt = evt.startedAt.toISOString();
          lead.totalCallsCount = (lead.totalCallsCount || 0) + 1;
          lead.totalDurationSeconds = (lead.totalDurationSeconds || 0) + evt.durationSeconds;
          lead.updatedAt = new Date().toISOString();
        }
      } catch (e) {
        errors++;
      }
    }

    return { inserted, duplicates, errors };
  }

  async getCallEvents(
    orgId: string,
    options: {
      page?: number;
      pageSize?: number;
      employeeId?: string;
      teamId?: string;
      deviceId?: string;
      direction?: CallDirection;
      outcome?: CallOutcome;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    }
  ): Promise<PaginatedResult<CallEvent>> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    let items = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);

    if (options.employeeId) items = items.filter(c => c.employeeId === options.employeeId);
    if (options.deviceId) items = items.filter(c => c.deviceId === options.deviceId);
    if (options.direction) items = items.filter(c => c.direction === options.direction);
    if (options.outcome) items = items.filter(c => c.outcome === options.outcome);
    if (options.startDate) items = items.filter(c => new Date(c.startedAt) >= options.startDate!);
    if (options.endDate) items = items.filter(c => new Date(c.startedAt) <= options.endDate!);
    if (options.teamId) {
      const teamMembers = Array.from(this.memberships.values())
        .filter(m => m.teamId === options.teamId)
        .map(m => m.id);
      items = items.filter(c => teamMembers.includes(c.employeeId));
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(c =>
        c.rawPhoneNumber.toLowerCase().includes(q) ||
        c.employeeName?.toLowerCase().includes(q) ||
        c.leadName?.toLowerCase().includes(q) ||
        c.deviceName?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    // Apply number masking based on org settings
    const org = this.organizations.get(orgId);
    const masked = paginated.map(evt => {
      let display = evt.rawPhoneNumber;
      if (org?.maskPhoneNumbers && display.length >= 7) {
        display = display.slice(0, 3) + '****' + display.slice(-4);
      }
      return { ...evt, displayPhoneNumber: display };
    });

    return {
      data: masked,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async getCallEventById(orgId: string, eventId: string): Promise<CallEvent | null> {
    const evt = this.callEvents.get(eventId);
    if (!evt || evt.organizationId !== orgId) return null;
    return { ...evt };
  }

  async clearDemoCalls(orgId: string): Promise<number> {
    let deleted = 0;
    for (const [id, c] of this.callEvents.entries()) {
      if (c.organizationId === orgId && (c.id.startsWith('cccccccc-cccc-cccc-cccc-cccccccc000') || c.sourceCallId.startsWith('call_log_100'))) {
        this.callEvents.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  // Analytics
  async getAnalyticsOverview(orgId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsOverview> {
    let items = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);
    if (startDate) items = items.filter(c => new Date(c.startedAt) >= startDate);
    if (endDate) items = items.filter(c => new Date(c.startedAt) <= endDate);

    const totalCalls = items.length;
    let incomingCalls = 0;
    let outgoingCalls = 0;
    let answeredCalls = 0;
    let missedCalls = 0;
    let rejectedCalls = 0;
    let totalConnectedDurationSeconds = 0;

    for (const c of items) {
      if (c.direction === 'INCOMING') incomingCalls++;
      if (c.direction === 'OUTGOING') outgoingCalls++;
      if (c.outcome === 'ANSWERED') {
        answeredCalls++;
        totalConnectedDurationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') missedCalls++;
      if (c.outcome === 'REJECTED' || c.direction === 'REJECTED') rejectedCalls++;
    }

    const avgConnectedDurationSeconds = answeredCalls > 0 ? Math.round(totalConnectedDurationSeconds / answeredCalls) : 0;
    const activeEmployeesCount = Array.from(this.memberships.values()).filter(m => m.organizationId === orgId && m.isActive).length;
    const enrolledDevicesCount = Array.from(this.devices.values()).filter(d => d.organizationId === orgId && d.status === 'ACTIVE').length;

    return {
      totalCalls,
      incomingCalls,
      outgoingCalls,
      answeredCalls,
      missedCalls,
      rejectedCalls,
      totalConnectedDurationSeconds,
      avgConnectedDurationSeconds,
      activeEmployeesCount,
      enrolledDevicesCount
    };
  }

  async getDailyTrends(orgId: string, startDate?: Date, endDate?: Date): Promise<DailyCallTrend[]> {
    let items = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);
    if (startDate) items = items.filter(c => new Date(c.startedAt) >= startDate);
    if (endDate) items = items.filter(c => new Date(c.startedAt) <= endDate);

    const map = new Map<string, DailyCallTrend>();

    // Seed last 7 days so chart doesn't have holes
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      map.set(d, {
        date: d,
        total: 0,
        incoming: 0,
        outgoing: 0,
        answered: 0,
        missed: 0,
        totalDurationSeconds: 0
      });
    }

    for (const c of items) {
      const day = c.startedAt.split('T')[0];
      let entry = map.get(day);
      if (!entry) {
        entry = { date: day, total: 0, incoming: 0, outgoing: 0, answered: 0, missed: 0, totalDurationSeconds: 0 };
        map.set(day, entry);
      }
      entry.total++;
      if (c.direction === 'INCOMING') entry.incoming++;
      if (c.direction === 'OUTGOING') entry.outgoing++;
      if (c.outcome === 'ANSWERED') {
        entry.answered++;
        entry.totalDurationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') entry.missed++;
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getEmployeePerformance(orgId: string, startDate?: Date, endDate?: Date): Promise<EmployeePerformance[]> {
    const orgMembers = Array.from(this.memberships.values()).filter(m => m.organizationId === orgId && m.isActive);
    let items = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);
    if (startDate) items = items.filter(c => new Date(c.startedAt) >= startDate);
    if (endDate) items = items.filter(c => new Date(c.startedAt) <= endDate);

    const result: EmployeePerformance[] = [];

    for (const m of orgMembers) {
      const user = this.profiles.get(m.userId);
      const team = m.teamId ? this.teams.get(m.teamId) : undefined;
      const empCalls = items.filter(c => c.employeeId === m.id);

      let totalCalls = empCalls.length;
      let answeredCalls = 0;
      let missedCalls = 0;
      let outgoingCalls = 0;
      let incomingCalls = 0;
      let totalDurationSeconds = 0;
      let lastActiveAt: string | undefined;

      for (const c of empCalls) {
        if (c.outcome === 'ANSWERED') {
          answeredCalls++;
          totalDurationSeconds += c.durationSeconds;
        }
        if (c.outcome === 'MISSED' || c.direction === 'MISSED') missedCalls++;
        if (c.direction === 'OUTGOING') outgoingCalls++;
        if (c.direction === 'INCOMING') incomingCalls++;
        if (!lastActiveAt || new Date(c.startedAt) > new Date(lastActiveAt)) {
          lastActiveAt = c.startedAt;
        }
      }

      const avgDurationSeconds = answeredCalls > 0 ? Math.round(totalDurationSeconds / answeredCalls) : 0;

      result.push({
        employeeId: m.id,
        employeeName: user?.fullName || 'Unknown',
        teamName: team?.name,
        totalCalls,
        answeredCalls,
        missedCalls,
        outgoingCalls,
        incomingCalls,
        totalDurationSeconds,
        avgDurationSeconds,
        lastActiveAt
      });
    }

    return result.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  async getDeviceSyncHealth(orgId: string): Promise<DeviceSyncHealth[]> {
    const devList = await this.getDevices(orgId);
    const now = Date.now();

    return devList.map(d => {
      let syncStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NEVER_SYNCED' = 'HEALTHY';
      if (!d.lastSyncAt) {
        syncStatus = 'NEVER_SYNCED';
      } else {
        const diffMinutes = (now - new Date(d.lastSyncAt).getTime()) / 60000;
        if (diffMinutes > 1440) { // > 24 hours
          syncStatus = 'CRITICAL';
        } else if (diffMinutes > 60) { // > 1 hour
          syncStatus = 'WARNING';
        }
      }

      return {
        deviceId: d.id,
        deviceName: d.deviceName,
        employeeName: d.employee?.fullName || 'Unassigned',
        model: d.model,
        lastContactAt: d.lastContactAt,
        lastSyncAt: d.lastSyncAt,
        status: d.status,
        permissionGranted: d.permissionGranted,
        appVersion: d.appVersion,
        syncStatus
      };
    });
  }

  // Leads
  async getLeads(
    orgId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: LeadStatus;
      assignedEmployeeId?: string;
      search?: string;
    }
  ): Promise<PaginatedResult<Lead>> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    let items = Array.from(this.leads.values()).filter(l => l.organizationId === orgId);

    if (options.status) items = items.filter(l => l.status === options.status);
    if (options.assignedEmployeeId) items = items.filter(l => l.assignedEmployeeId === options.assignedEmployeeId);
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phoneNumber.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginated,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async getLeadById(orgId: string, leadId: string): Promise<Lead | null> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.organizationId !== orgId) return null;
    return { ...lead };
  }

  async findLeadByPhone(orgId: string, phone: string): Promise<Lead | null> {
    const clean = phone.replace(/[^0-9]/g, '');
    for (const l of this.leads.values()) {
      if (l.organizationId === orgId) {
        const leadClean = l.phoneNumber.replace(/[^0-9]/g, '');
        if (leadClean.endsWith(clean) || clean.endsWith(leadClean)) {
          return { ...l };
        }
      }
    }
    return null;
  }

  async createLead(data: Partial<Lead> & { organizationId: string; name: string; phoneNumber: string }): Promise<Lead> {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    let assignedEmployee: { id: string; fullName: string; email: string } | undefined;
    if (data.assignedEmployeeId) {
      const m = this.memberships.get(data.assignedEmployeeId);
      const u = m ? this.profiles.get(m.userId) : undefined;
      if (m && u) assignedEmployee = { id: m.id, fullName: u.fullName, email: u.email };
    }

    const lead: Lead = {
      id,
      organizationId: data.organizationId,
      assignedEmployeeId: data.assignedEmployeeId,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email,
      company: data.company,
      status: data.status || 'NEW',
      source: data.source || 'MANUAL',
      followUpAt: data.followUpAt,
      lastContactedAt: data.lastContactedAt,
      notesCount: 0,
      totalCallsCount: 0,
      totalDurationSeconds: 0,
      assignedEmployee,
      createdAt: now,
      updatedAt: now
    };
    this.leads.set(id, lead);
    return { ...lead };
  }

  async updateLead(orgId: string, leadId: string, data: Partial<Lead>): Promise<Lead> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.organizationId !== orgId) throw new Error('Lead not found');

    if (data.assignedEmployeeId !== undefined && data.assignedEmployeeId !== lead.assignedEmployeeId) {
      if (data.assignedEmployeeId) {
        const m = this.memberships.get(data.assignedEmployeeId);
        const u = m ? this.profiles.get(m.userId) : undefined;
        if (m && u) lead.assignedEmployee = { id: m.id, fullName: u.fullName, email: u.email };
      } else {
        lead.assignedEmployee = undefined;
      }
    }

    const updated: Lead = {
      ...lead,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.leads.set(leadId, updated);
    return { ...updated };
  }

  async createLeadNote(orgId: string, leadId: string, authorId: string, noteText: string): Promise<LeadNote> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.organizationId !== orgId) throw new Error('Lead not found');

    const author = this.profiles.get(authorId);
    const id = crypto.randomUUID();
    const note: LeadNote = {
      id,
      leadId,
      organizationId: orgId,
      authorId,
      note: noteText,
      authorName: author?.fullName,
      createdAt: new Date().toISOString()
    };
    this.leadNotes.set(id, note);
    lead.notesCount = (lead.notesCount || 0) + 1;
    lead.updatedAt = new Date().toISOString();

    return { ...note };
  }

  async getLeadNotes(leadId: string): Promise<LeadNote[]> {
    return Array.from(this.leadNotes.values())
      .filter(n => n.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFollowUps(orgId: string, employeeId?: string): Promise<FollowUpTask[]> {
    let items = Array.from(this.followUps.values()).filter(f => f.organizationId === orgId);
    if (employeeId) items = items.filter(f => f.assignedEmployeeId === employeeId);
    return items.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  // Audit Logs
  async createAuditLog(log: {
    organizationId?: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    details?: any;
  }): Promise<void> {
    const actor = this.profiles.get(log.actorId);
    this.auditLogs.unshift({
      id: crypto.randomUUID(),
      organizationId: log.organizationId,
      actorId: log.actorId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      details: log.details,
      actorName: actor?.fullName,
      actorEmail: actor?.email,
      createdAt: new Date().toISOString()
    });
  }

  async getAuditLogs(orgId: string, page = 1, pageSize = 20): Promise<PaginatedResult<AuditLog>> {
    const items = this.auditLogs.filter(l => l.organizationId === orgId);
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, total, page, pageSize, totalPages };
  }

  // Super Admin
  async getAllOrganizations(): Promise<any[]> {
    return Array.from(this.organizations.values()).map(o => {
      const devCount = Array.from(this.devices.values()).filter(d => d.organizationId === o.id).length;
      const memberCount = Array.from(this.memberships.values()).filter(m => m.organizationId === o.id).length;
      const callCount = Array.from(this.callEvents.values()).filter(c => c.organizationId === o.id).length;
      return {
        ...o,
        deviceCount: devCount,
        memberCount: memberCount,
        callCount: callCount
      };
    });
  }

  async getSystemUsage(): Promise<any> {
    return {
      totalOrganizations: this.organizations.size,
      totalUsers: this.profiles.size,
      totalDevices: this.devices.size,
      totalCallEvents: this.callEvents.size,
      totalSyncBatches: this.syncBatches.size,
      uptimeSeconds: process.uptime()
    };
  }
}

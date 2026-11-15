import fs from 'fs';
import path from 'path';
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
  PaginatedResult,
  AdvancedAnalyticsResponse,
  UnattendedCallItem,
  TimeGroupedReportItem,
  DesktopDevice,
  DesktopActivitySlot,
  DesktopClockEvent,
  IngestDesktopActivityDto,
  WorkStatus,
  ProductivityOverviewResponse,
  EmployeeProductivitySummary,
  ActivityCategory,
  CallAiAnalysis,
  CallingCampaign,
  CampaignLead,
  CampaignStatus,
  CampaignLeadStatus,
  WhatsAppTemplate,
  WebhookConfig,
  AttendanceRecord,
  AttendanceStatus,
  LocationPing,
  ClientVisit,
  ClientVisitOutcome,
  LiveAgentLocation,
  FieldTrackingSummary
} from '@teletrack/shared-types';
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
  public desktopDevices: Map<string, DesktopDevice> = new Map();
  public desktopSessions: Map<string, { deviceId: string; apiKeyHash: string; expiresAt: Date; revokedAt?: Date }> = new Map();
  public desktopActivitySlots: DesktopActivitySlot[] = [];
  public desktopClockEvents: DesktopClockEvent[] = [];
  public callingCampaigns: Map<string, CallingCampaign> = new Map();
  public whatsAppTemplates: Map<string, WhatsAppTemplate> = new Map();
  public webhooks: Map<string, WebhookConfig> = new Map();
  public attendances: Map<string, AttendanceRecord> = new Map();
  public locationPings: LocationPing[] = [];
  public clientVisits: Map<string, ClientVisit> = new Map();

  private persistPath: string = path.resolve(process.cwd(), 'data/database.json');

  constructor() {
    if (!this.loadFromDisk()) {
      this.seedDefaultData();
      this.saveToDisk();
    }
  }

  public saveToDisk(): void {
    try {
      const data = {
        profiles: Array.from(this.profiles.entries()),
        organizations: Array.from(this.organizations.entries()),
        teams: Array.from(this.teams.entries()),
        memberships: Array.from(this.memberships.entries()),
        devices: Array.from(this.devices.entries()),
        deviceSessions: Array.from(this.deviceSessions.entries()),
        enrollmentTokens: Array.from(this.enrollmentTokens.entries()),
        callEvents: Array.from(this.callEvents.entries()),
        syncBatches: Array.from(this.syncBatches.entries()),
        leads: Array.from(this.leads.entries()),
        leadNotes: Array.from(this.leadNotes.entries()),
        followUps: Array.from(this.followUps.entries()),
        auditLogs: this.auditLogs,
        subscriptionPlans: Array.from(this.subscriptionPlans.entries()),
        organizationSubscriptions: Array.from(this.organizationSubscriptions.entries()),
        desktopDevices: Array.from(this.desktopDevices.entries()),
        desktopSessions: Array.from(this.desktopSessions.entries()),
        desktopActivitySlots: this.desktopActivitySlots,
        desktopClockEvents: this.desktopClockEvents,
        callingCampaigns: Array.from(this.callingCampaigns.entries()),
        whatsAppTemplates: Array.from(this.whatsAppTemplates.entries()),
        webhooks: Array.from(this.webhooks.entries()),
        attendances: Array.from(this.attendances.entries()),
        locationPings: this.locationPings,
        clientVisits: Array.from(this.clientVisits.entries())
      };
      fs.mkdirSync(path.dirname(this.persistPath), { recursive: true });
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[MemoryDatabase] Failed to persist data to disk:', e);
    }
  }

  public loadFromDisk(): boolean {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.profiles) this.profiles = new Map(data.profiles);
        if (data.organizations) this.organizations = new Map(data.organizations);
        if (data.teams) this.teams = new Map(data.teams);
        if (data.memberships) this.memberships = new Map(data.memberships);
        if (data.devices) this.devices = new Map(data.devices);
        if (data.deviceSessions) this.deviceSessions = new Map(data.deviceSessions);
        if (data.enrollmentTokens) this.enrollmentTokens = new Map(data.enrollmentTokens);
        if (data.callEvents) this.callEvents = new Map(data.callEvents);
        if (data.syncBatches) this.syncBatches = new Map(data.syncBatches);
        if (data.leads) this.leads = new Map(data.leads);
        if (data.leadNotes) this.leadNotes = new Map(data.leadNotes);
        if (data.followUps) this.followUps = new Map(data.followUps);
        if (data.auditLogs) this.auditLogs = data.auditLogs;
        if (data.subscriptionPlans) this.subscriptionPlans = new Map(data.subscriptionPlans);
        if (data.organizationSubscriptions) this.organizationSubscriptions = new Map(data.organizationSubscriptions);
        if (data.desktopDevices) this.desktopDevices = new Map(data.desktopDevices);
        if (data.desktopSessions) this.desktopSessions = new Map(data.desktopSessions);
        if (data.desktopActivitySlots) this.desktopActivitySlots = data.desktopActivitySlots;
        if (data.desktopClockEvents) this.desktopClockEvents = data.desktopClockEvents;
        if (data.callingCampaigns) this.callingCampaigns = new Map(data.callingCampaigns);
        if (data.whatsAppTemplates) this.whatsAppTemplates = new Map(data.whatsAppTemplates);
        if (data.webhooks) this.webhooks = new Map(data.webhooks);
        if (data.attendances) this.attendances = new Map(data.attendances);
        if (data.locationPings) this.locationPings = data.locationPings;
        if (data.clientVisits) this.clientVisits = new Map(data.clientVisits);

        // Ensure all loaded profiles have a clean username
        for (const [id, p] of this.profiles.entries()) {
          if (!p.username) {
            p.username = p.email.split('@')[0].toLowerCase();
            this.profiles.set(id, p);
          }
        }

        this.ensurePillarDataSeeded();

        console.log(`[MemoryDatabase] Loaded persistent state from disk (${this.callEvents.size} call events, ${this.devices.size} devices, ${this.callingCampaigns.size} campaigns)`);
        return true;
      }
    } catch (e) {
      console.error('[MemoryDatabase] Failed to load data from disk:', e);
    }
    return false;
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
      email: 'superadmin@teletrack.io',
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

  async findProfileByIdentifier(identifier: string): Promise<(UserProfile & { passwordHash?: string }) | null> {
    const raw = identifier.trim();
    const idLower = raw.toLowerCase();

    // 1. Direct profile email or username
    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase() === idLower || (p.username && p.username.toLowerCase() === idLower) || p.id === raw) {
        return { ...p };
      }
    }

    // 2. Check if identifier matches an employeeCode in any active membership
    for (const m of this.memberships.values()) {
      if (m.employeeCode && m.employeeCode.toLowerCase() === idLower && m.isActive) {
        const p = this.profiles.get(m.userId);
        if (p) return { ...p };
      }
    }

    // 3. Match username before domain (e.g. "rahul" matching "rahul@teletrack.io")
    for (const p of this.profiles.values()) {
      const emailPrefix = p.email.split('@')[0].toLowerCase();
      if (emailPrefix === idLower) {
        return { ...p };
      }
    }

    return null;
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    const p = this.profiles.get(id);
    if (!p) return null;
    const { passwordHash, ...clean } = p;
    return { ...clean };
  }

  async createProfile(data: Partial<UserProfile> & { email: string; fullName: string; passwordHash: string; username?: string }): Promise<UserProfile> {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const username = data.username ? data.username.toLowerCase().trim() : data.email.split('@')[0].toLowerCase().trim();
    const profile: UserProfile & { passwordHash?: string } = {
      id,
      email: data.email.toLowerCase().trim(),
      username,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      phone: data.phone,
      isSuperAdmin: false,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now
    };
    this.profiles.set(id, profile);
    this.saveToDisk();
    const { passwordHash, ...clean } = profile;
    return clean;
  }

  async updateProfilePassword(userId: string, passwordHash: string): Promise<boolean> {
    const p = this.profiles.get(userId);
    if (!p) return false;
    p.passwordHash = passwordHash;
    p.updatedAt = new Date().toISOString();
    this.profiles.set(userId, p);
    this.saveToDisk();
    return true;
  }

  // Organizations & Memberships
  async getUserMemberships(userId: string): Promise<OrganizationMembership[]> {
    const list: OrganizationMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.isActive) {
        const org = this.organizations.get(m.organizationId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        list.push({ ...m, organization: org ? { ...org } : undefined, team });
      }
    }
    return list;
  }

  async getOrganizationById(orgId: string): Promise<Organization | null> {
    return this.organizations.get(orgId) ? { ...this.organizations.get(orgId)! } : null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const q = slug.toLowerCase().trim();
    if (!q) return null;
    for (const o of this.organizations.values()) {
      if (
        o.slug.toLowerCase() === q ||
        o.id.toLowerCase() === q ||
        o.name.toLowerCase() === q
      ) {
        return { ...o };
      }
    }
    // Fallback prefix match on slug (e.g. "acme" or "beta-logistics" matching "beta-logistics-pvt-ltd-4240")
    for (const o of this.organizations.values()) {
      if (o.slug.toLowerCase().startsWith(q) || o.id.toLowerCase().startsWith(q)) {
        return { ...o };
      }
    }
    return null;
  }

  async createOrganization(data: { name: string; slug: string; timezone?: string }): Promise<Organization> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const org: Organization = {
      id,
      name: data.name,
      slug: data.slug.toLowerCase().trim(),
      timezone: data.timezone || 'Asia/Kolkata',
      retentionDays: 90,
      maskPhoneNumbers: false,
      maxDevices: 25,
      createdAt: now,
      updatedAt: now
    };
    this.organizations.set(id, org);
    this.saveToDisk();
    return { ...org };
  }

  async updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error('Organization not found');
    const updated = { ...org, ...data, updatedAt: new Date().toISOString() };
    this.organizations.set(orgId, updated);
    this.saveToDisk();
    return { ...updated };
  }

  async getOrgMembers(orgId: string): Promise<OrganizationMembership[]> {
    const list: OrganizationMembership[] = [];
    const org = this.organizations.get(orgId);
    const orgDevices = Array.from(this.devices.values()).filter(d => d.organizationId === orgId && d.status !== 'REVOKED');
    const orgDesktopDevices = Array.from(this.desktopDevices.values()).filter(d => d.organizationId === orgId && d.status !== 'REVOKED');
    
    const callCountByEmp = new Map<string, number>();
    for (const c of this.callEvents.values()) {
      if (c.organizationId === orgId) {
        callCountByEmp.set(c.employeeId, (callCountByEmp.get(c.employeeId) || 0) + 1);
      }
    }

    const desktopActiveByEmp = new Map<string, number>();
    for (const slot of this.desktopActivitySlots) {
      if (slot.organizationId === orgId && !slot.isIdle) {
        desktopActiveByEmp.set(slot.employeeId, (desktopActiveByEmp.get(slot.employeeId) || 0) + slot.durationSeconds);
      }
    }

    for (const m of this.memberships.values()) {
      if (m.organizationId === orgId && m.isActive) {
        const user = await this.findProfileById(m.userId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        const empDevices = orgDevices.filter(d => d.employeeId === m.id);
        const empDesktopDevices = orgDesktopDevices.filter(d => d.employeeId === m.id);
        const totalCalls = callCountByEmp.get(m.id) || 0;
        const desktopActiveSeconds = desktopActiveByEmp.get(m.id) || 0;

        list.push({
          ...m,
          user: user || undefined,
          team,
          organization: org ? { ...org } : undefined,
          devices: empDevices,
          desktopDevices: empDesktopDevices,
          desktopActiveSeconds,
          totalCalls
        });
      }
    }
    return list;
  }

  async getMembership(orgId: string, userId: string): Promise<OrganizationMembership | null> {
    for (const m of this.memberships.values()) {
      if (m.organizationId === orgId && m.userId === userId && m.isActive) {
        const user = await this.findProfileById(m.userId);
        const team = m.teamId ? this.teams.get(m.teamId) : undefined;
        const org = this.organizations.get(orgId);
        return { ...m, user: user || undefined, team, organization: org ? { ...org } : undefined };
      }
    }
    return null;
  }

  async createMembership(data: { organizationId: string; userId: string; role: UserRole; teamId?: string; employeeCode?: string }): Promise<OrganizationMembership> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = await this.findProfileById(data.userId);
    const team = data.teamId ? this.teams.get(data.teamId) : undefined;
    const org = this.organizations.get(data.organizationId);
    const orgCount = Array.from(this.memberships.values()).filter(x => x.organizationId === data.organizationId).length;
    const m: OrganizationMembership = {
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role,
      teamId: data.teamId,
      employeeCode: data.employeeCode || `EMP-${String(orgCount + 1).padStart(3, '0')}`,
      isActive: true,
      user: user || undefined,
      team,
      organization: org ? { ...org } : undefined,
      createdAt: now,
      updatedAt: now
    };
    this.memberships.set(id, m);
    this.saveToDisk();
    return { ...m };
  }

  async updateMembership(
    orgId: string,
    membershipId: string,
    data: { role?: UserRole; teamId?: string | null; employeeCode?: string; isActive?: boolean }
  ): Promise<OrganizationMembership | null> {
    const m = this.memberships.get(membershipId);
    if (!m || m.organizationId !== orgId) return null;
    if (data.role !== undefined) m.role = data.role;
    if (data.teamId !== undefined) m.teamId = data.teamId || undefined;
    if (data.employeeCode !== undefined) m.employeeCode = data.employeeCode;
    if (data.isActive !== undefined) m.isActive = data.isActive;
    m.updatedAt = new Date().toISOString();
    m.team = m.teamId ? this.teams.get(m.teamId) : undefined;
    this.memberships.set(membershipId, m);
    this.saveToDisk();
    const user = await this.findProfileById(m.userId);
    return { ...m, user: user || undefined };
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
    this.saveToDisk();
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
    this.saveToDisk();
    return id;
  }

  async verifyAndConsumeEnrollmentToken(tokenHash: string): Promise<{ organizationId: string; employeeId: string } | null> {
    const token = this.enrollmentTokens.get(tokenHash);
    if (!token) return null;
    if (token.usedAt || new Date(token.expiresAt) < new Date()) return null;
    token.usedAt = new Date();
    this.saveToDisk();
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
    this.saveToDisk();
    return { ...device };
  }

  async createDeviceSession(deviceId: string, apiKeyHash: string, expiresAt: Date): Promise<void> {
    this.deviceSessions.set(apiKeyHash, {
      deviceId,
      apiKeyHash,
      expiresAt
    });
    this.saveToDisk();
  }

  async findDeviceByApiKeyHash(apiKeyHash: string): Promise<Device | null> {
    const session = this.deviceSessions.get(apiKeyHash);
    if (!session || (session.revokedAt) || new Date(session.expiresAt) < new Date()) {
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
      this.saveToDisk();
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
    this.saveToDisk();
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

    if (inserted > 0) {
      this.saveToDisk();
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

  async updateCallEventRecording(orgId: string, callId: string, data: {
    recordingUrl: string;
    durationSeconds?: number;
    fileSize?: number;
    aiAnalysis?: CallAiAnalysis;
  }): Promise<CallEvent | null> {
    const evt = this.callEvents.get(callId);
    if (!evt || evt.organizationId !== orgId) return null;

    evt.hasRecording = true;
    evt.recordingUrl = data.recordingUrl;
    if (data.durationSeconds) evt.recordingDurationSeconds = data.durationSeconds;
    if (data.fileSize) evt.recordingFileSize = data.fileSize;
    if (data.aiAnalysis) evt.aiAnalysis = data.aiAnalysis;

    this.callEvents.set(callId, evt);
    this.saveToDisk();
    return { ...evt };
  }

  async updateCallAiAnalysis(orgId: string, callId: string, analysis: CallAiAnalysis): Promise<CallEvent | null> {
    const evt = this.callEvents.get(callId);
    if (!evt || evt.organizationId !== orgId) return null;

    evt.aiAnalysis = analysis;
    this.callEvents.set(callId, evt);
    this.saveToDisk();
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
    // Also remove seeded demo devices so only enrolled devices remain
    for (const [id, d] of this.devices.entries()) {
      if (d.organizationId === orgId && (d.deviceIdentifier.startsWith('device-android-rahul') || d.deviceIdentifier.startsWith('device-android-sneha'))) {
        this.devices.delete(id);
      }
    }
    this.saveToDisk();
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

  async getAdvancedAnalytics(
    orgId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      employeeId?: string;
      teamId?: string;
    }
  ): Promise<AdvancedAnalyticsResponse> {
    let items = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);

    if (options?.employeeId) {
      items = items.filter(c => c.employeeId === options.employeeId);
    }
    if (options?.teamId) {
      const teamMemberIds = new Set(
        Array.from(this.memberships.values())
          .filter(m => m.organizationId === orgId && m.teamId === options.teamId)
          .map(m => m.id)
      );
      items = items.filter(c => teamMemberIds.has(c.employeeId));
    }
    if (options?.startDate) {
      items = items.filter(c => new Date(c.startedAt) >= options.startDate!);
    }
    if (options?.endDate) {
      items = items.filter(c => new Date(c.startedAt) <= options.endDate!);
    }

    let totalCalls = items.length;
    let incomingCalls = 0;
    let outgoingCalls = 0;
    let answeredCalls = 0;
    let missedCalls = 0;
    let rejectedCalls = 0;
    let inboundDurationSeconds = 0;
    let outboundDurationSeconds = 0;

    const uniqueClientsSet = new Set<string>();

    for (const c of items) {
      uniqueClientsSet.add(c.rawPhoneNumber);
      if (c.direction === 'INCOMING') incomingCalls++;
      if (c.direction === 'OUTGOING') outgoingCalls++;

      if (c.outcome === 'ANSWERED') {
        answeredCalls++;
        if (c.direction === 'INCOMING') {
          inboundDurationSeconds += c.durationSeconds;
        } else {
          outboundDurationSeconds += c.durationSeconds;
        }
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') missedCalls++;
      if (c.outcome === 'REJECTED' || c.direction === 'REJECTED') rejectedCalls++;
    }

    const totalDurationSeconds = inboundDurationSeconds + outboundDurationSeconds;
    const avgConnectedDurationSeconds = answeredCalls > 0 ? Math.round(totalDurationSeconds / answeredCalls) : 0;

    // Unattended Calls: Pre-calculate latest contact timestamp per phone number
    const allOrgCalls = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);
    const latestContactByPhone = new Map<string, number>();
    for (const c of allOrgCalls) {
      const isContact = c.direction === 'OUTGOING' || (c.direction === 'INCOMING' && c.outcome === 'ANSWERED');
      if (isContact) {
        const t = new Date(c.startedAt).getTime();
        const prev = latestContactByPhone.get(c.rawPhoneNumber) || 0;
        if (t > prev) latestContactByPhone.set(c.rawPhoneNumber, t);
      }
    }

    const unattendedMap = new Map<string, UnattendedCallItem>();
    const now = Date.now();

    for (const c of items) {
      const isUnanswered = c.direction === 'INCOMING' && (c.outcome === 'MISSED' || c.outcome === 'REJECTED' || c.durationSeconds === 0);
      if (!isUnanswered) continue;

      const missedTimestamp = new Date(c.startedAt).getTime();
      const latestContactTime = latestContactByPhone.get(c.rawPhoneNumber) || 0;
      const hasSubsequentContact = latestContactTime > missedTimestamp;

      if (!hasSubsequentContact) {
        const existing = unattendedMap.get(c.rawPhoneNumber);
        const diffMs = now - missedTimestamp;
        const hoursAgo = Math.floor(diffMs / 3600000);
        const daysAgo = Math.floor(diffMs / 86400000);
        const timeElapsed = daysAgo > 0 ? `${daysAgo}d ago` : hoursAgo > 0 ? `${hoursAgo}h ago` : 'Just now';

        if (!existing || new Date(c.startedAt) > new Date(existing.missedAt)) {
          unattendedMap.set(c.rawPhoneNumber, {
            phoneNumber: c.displayPhoneNumber,
            leadName: c.leadName,
            leadId: c.leadId,
            missedAt: c.startedAt,
            employeeName: c.employeeName || 'Unassigned',
            employeeId: c.employeeId,
            teamName: c.teamName,
            callDirection: c.direction,
            callOutcome: c.outcome,
            totalMissedAttempts: (existing?.totalMissedAttempts || 0) + 1,
            timeElapsed
          });
        } else {
          existing.totalMissedAttempts++;
        }
      }
    }

    const unattendedCalls = Array.from(unattendedMap.values()).sort((a, b) => new Date(b.missedAt).getTime() - new Date(a.missedAt).getTime());
    const neverAttendedCount = unattendedCalls.length;
    const neverAttendedRate = missedCalls + rejectedCalls > 0 ? Math.round((neverAttendedCount / (missedCalls + rejectedCalls)) * 100) : 0;

    const createAggregateBucket = () => ({
      totalCalls: 0,
      incomingCalls: 0,
      outgoingCalls: 0,
      answeredCalls: 0,
      missedCalls: 0,
      rejectedCalls: 0,
      totalDurationSeconds: 0,
      uniqueNumbers: new Set<string>()
    });

    // Day-wise
    const dayMap = new Map<string, ReturnType<typeof createAggregateBucket>>();
    for (const c of items) {
      const d = c.startedAt.split('T')[0];
      let b = dayMap.get(d);
      if (!b) {
        b = createAggregateBucket();
        dayMap.set(d, b);
      }
      b.totalCalls++;
      b.uniqueNumbers.add(c.rawPhoneNumber);
      if (c.direction === 'INCOMING') b.incomingCalls++;
      if (c.direction === 'OUTGOING') b.outgoingCalls++;
      if (c.outcome === 'ANSWERED') {
        b.answeredCalls++;
        b.totalDurationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') b.missedCalls++;
      if (c.outcome === 'REJECTED' || c.direction === 'REJECTED') b.rejectedCalls++;
    }

    const dayWise: TimeGroupedReportItem[] = Array.from(dayMap.entries())
      .map(([dateKey, b]) => {
        const dt = new Date(`${dateKey}T00:00:00Z`);
        const label = dt.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
        return {
          periodKey: dateKey,
          periodLabel: label,
          startDate: `${dateKey}T00:00:00.000Z`,
          endDate: `${dateKey}T23:59:59.999Z`,
          totalCalls: b.totalCalls,
          incomingCalls: b.incomingCalls,
          outgoingCalls: b.outgoingCalls,
          answeredCalls: b.answeredCalls,
          missedCalls: b.missedCalls,
          rejectedCalls: b.rejectedCalls,
          answerRate: b.totalCalls > 0 ? Math.round((b.answeredCalls / b.totalCalls) * 100) : 0,
          totalDurationSeconds: b.totalDurationSeconds,
          avgDurationSeconds: b.answeredCalls > 0 ? Math.round(b.totalDurationSeconds / b.answeredCalls) : 0,
          uniqueNumbersCount: b.uniqueNumbers.size
        };
      })
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));

    // Week-wise with Day-level caching
    const weekInfoCache = new Map<string, { key: string; label: string; startDate: string; endDate: string }>();
    const getWeekInfo = (dateStr: string) => {
      const dayKey = dateStr.slice(0, 10);
      const cached = weekInfoCache.get(dayKey);
      if (cached) return cached;

      const date = new Date(dateStr);
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

      const monday = new Date(date);
      const day = monday.getDay();
      const diffToMonday = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const monStr = monday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const sunStr = sunday.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      const res = {
        key: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
        label: `Week ${weekNo} (${monStr} - ${sunStr})`,
        startDate: monday.toISOString(),
        endDate: sunday.toISOString()
      };
      weekInfoCache.set(dayKey, res);
      return res;
    };

    const weekMap = new Map<string, { info: ReturnType<typeof getWeekInfo>; bucket: ReturnType<typeof createAggregateBucket> }>();
    for (const c of items) {
      const info = getWeekInfo(c.startedAt);
      let entry = weekMap.get(info.key);
      if (!entry) {
        entry = { info, bucket: createAggregateBucket() };
        weekMap.set(info.key, entry);
      }
      entry.bucket.totalCalls++;
      entry.bucket.uniqueNumbers.add(c.rawPhoneNumber);
      if (c.direction === 'INCOMING') entry.bucket.incomingCalls++;
      if (c.direction === 'OUTGOING') entry.bucket.outgoingCalls++;
      if (c.outcome === 'ANSWERED') {
        entry.bucket.answeredCalls++;
        entry.bucket.totalDurationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') entry.bucket.missedCalls++;
      if (c.outcome === 'REJECTED' || c.direction === 'REJECTED') entry.bucket.rejectedCalls++;
    }

    const weekWise: TimeGroupedReportItem[] = Array.from(weekMap.values())
      .map(({ info, bucket: b }) => ({
        periodKey: info.key,
        periodLabel: info.label,
        startDate: info.startDate,
        endDate: info.endDate,
        totalCalls: b.totalCalls,
        incomingCalls: b.incomingCalls,
        outgoingCalls: b.outgoingCalls,
        answeredCalls: b.answeredCalls,
        missedCalls: b.missedCalls,
        rejectedCalls: b.rejectedCalls,
        answerRate: b.totalCalls > 0 ? Math.round((b.answeredCalls / b.totalCalls) * 100) : 0,
        totalDurationSeconds: b.totalDurationSeconds,
        avgDurationSeconds: b.answeredCalls > 0 ? Math.round(b.totalDurationSeconds / b.answeredCalls) : 0,
        uniqueNumbersCount: b.uniqueNumbers.size
      }))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));

    // Month-wise
    const monthMap = new Map<string, { label: string; startDate: string; endDate: string; bucket: ReturnType<typeof createAggregateBucket> }>();
    for (const c of items) {
      const mKey = c.startedAt.slice(0, 7);
      let entry = monthMap.get(mKey);
      if (!entry) {
        const [yStr, moStr] = mKey.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(moStr, 10);
        const dt = new Date(Date.UTC(y, m - 1, 1));
        const mLabel = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString();
        entry = { label: mLabel, startDate: start, endDate: end, bucket: createAggregateBucket() };
        monthMap.set(mKey, entry);
      }
      entry.bucket.totalCalls++;
      entry.bucket.uniqueNumbers.add(c.rawPhoneNumber);
      if (c.direction === 'INCOMING') entry.bucket.incomingCalls++;
      if (c.direction === 'OUTGOING') entry.bucket.outgoingCalls++;
      if (c.outcome === 'ANSWERED') {
        entry.bucket.answeredCalls++;
        entry.bucket.totalDurationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') entry.bucket.missedCalls++;
      if (c.outcome === 'REJECTED' || c.direction === 'REJECTED') entry.bucket.rejectedCalls++;
    }

    const monthWise: TimeGroupedReportItem[] = Array.from(monthMap.entries())
      .map(([mKey, { label, startDate, endDate, bucket: b }]) => ({
        periodKey: mKey,
        periodLabel: label,
        startDate,
        endDate,
        totalCalls: b.totalCalls,
        incomingCalls: b.incomingCalls,
        outgoingCalls: b.outgoingCalls,
        answeredCalls: b.answeredCalls,
        missedCalls: b.missedCalls,
        rejectedCalls: b.rejectedCalls,
        answerRate: b.totalCalls > 0 ? Math.round((b.answeredCalls / b.totalCalls) * 100) : 0,
        totalDurationSeconds: b.totalDurationSeconds,
        avgDurationSeconds: b.answeredCalls > 0 ? Math.round(b.totalDurationSeconds / b.answeredCalls) : 0,
        uniqueNumbersCount: b.uniqueNumbers.size
      }))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));

    // Hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, h) => {
      const hStr = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      const nextH = (h + 1) % 24;
      const nextHStr = nextH === 0 ? '12 AM' : nextH < 12 ? `${nextH} AM` : nextH === 12 ? '12 PM' : `${nextH - 12} PM`;
      return {
        hour: h,
        hourLabel: `${hStr} - ${nextHStr}`,
        total: 0,
        answered: 0,
        missed: 0,
        answerRate: 0,
        durationSeconds: 0
      };
    });

    for (const c of items) {
      const h = new Date(c.startedAt).getHours();
      const slot = hourlyDistribution[h];
      slot.total++;
      if (c.outcome === 'ANSWERED') {
        slot.answered++;
        slot.durationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') slot.missed++;
    }

    for (const slot of hourlyDistribution) {
      slot.answerRate = slot.total > 0 ? Math.round((slot.answered / slot.total) * 100) : 0;
    }

    // Duration buckets
    const durationBuckets = {
      under30s: 0,
      between30sAnd2m: 0,
      between2mAnd5m: 0,
      over5m: 0
    };

    for (const c of items) {
      if (c.outcome === 'ANSWERED') {
        const sec = c.durationSeconds;
        if (sec < 30) durationBuckets.under30s++;
        else if (sec <= 120) durationBuckets.between30sAnd2m++;
        else if (sec <= 300) durationBuckets.between2mAnd5m++;
        else durationBuckets.over5m++;
      }
    }

    // Day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekDistribution = dayNames.map((name, idx) => ({
      dayIndex: idx,
      dayName: name,
      total: 0,
      answered: 0,
      missed: 0,
      answerRate: 0,
      durationSeconds: 0
    }));

    for (const c of items) {
      const d = new Date(c.startedAt).getDay();
      const slot = dayOfWeekDistribution[d];
      slot.total++;
      if (c.outcome === 'ANSWERED') {
        slot.answered++;
        slot.durationSeconds += c.durationSeconds;
      }
      if (c.outcome === 'MISSED' || c.direction === 'MISSED') slot.missed++;
    }

    for (const slot of dayOfWeekDistribution) {
      slot.answerRate = slot.total > 0 ? Math.round((slot.answered / slot.total) * 100) : 0;
    }

    return {
      overview: {
        totalCalls,
        incomingCalls,
        outgoingCalls,
        answeredCalls,
        missedCalls,
        rejectedCalls,
        neverAttendedCount,
        neverAttendedRate,
        totalDurationSeconds,
        inboundDurationSeconds,
        outboundDurationSeconds,
        avgConnectedDurationSeconds,
        uniqueClientsCount: uniqueClientsSet.size
      },
      dayWise,
      weekWise,
      monthWise,
      unattendedCalls,
      hourlyDistribution,
      durationBuckets,
      dayOfWeekDistribution
    };
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

  // Desktop Tracking & Unified Productivity
  async getDesktopDevices(orgId: string): Promise<DesktopDevice[]> {
    const list: DesktopDevice[] = [];
    const now = Date.now();
    for (const d of this.desktopDevices.values()) {
      if (d.organizationId === orgId) {
        const member = this.memberships.get(d.employeeId);
        const user = member ? this.profiles.get(member.userId) : undefined;
        // Determine live status: if contacted within 3 minutes, use currentStatus; else OFFLINE
        let liveStatus: WorkStatus = d.currentStatus || 'OFFLINE';
        if (d.lastContactAt) {
          const diffMinutes = (now - new Date(d.lastContactAt).getTime()) / 60000;
          if (diffMinutes > 5) {
            liveStatus = 'OFFLINE';
          }
        } else {
          liveStatus = 'OFFLINE';
        }

        list.push({
          ...d,
          currentStatus: liveStatus,
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

  async getDesktopDeviceById(deviceId: string): Promise<DesktopDevice | null> {
    const d = this.desktopDevices.get(deviceId);
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

  async registerDesktopDevice(data: {
    organizationId: string;
    employeeId: string;
    hostname: string;
    osName: string;
    osVersion: string;
    appVersion: string;
  }): Promise<DesktopDevice> {
    // Check if machine already enrolled for this employee
    for (const d of this.desktopDevices.values()) {
      if (d.organizationId === data.organizationId && d.employeeId === data.employeeId && d.hostname.toLowerCase() === data.hostname.toLowerCase()) {
        d.osName = data.osName;
        d.osVersion = data.osVersion;
        d.appVersion = data.appVersion;
        d.status = 'ACTIVE';
        d.lastContactAt = new Date().toISOString();
        d.updatedAt = new Date().toISOString();
        this.saveToDisk();
        return { ...d };
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const device: DesktopDevice = {
      id,
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      hostname: data.hostname,
      osName: data.osName,
      osVersion: data.osVersion,
      appVersion: data.appVersion,
      status: 'ACTIVE',
      currentStatus: 'WORKING',
      lastContactAt: now,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.desktopDevices.set(id, device);
    this.saveToDisk();
    return { ...device };
  }

  async createDesktopDeviceSession(deviceId: string, apiKeyHash: string, expiresAt: Date): Promise<void> {
    this.desktopSessions.set(apiKeyHash, {
      deviceId,
      apiKeyHash,
      expiresAt
    });
    this.saveToDisk();
  }

  async findDesktopDeviceByApiKeyHash(apiKeyHash: string): Promise<DesktopDevice | null> {
    const session = this.desktopSessions.get(apiKeyHash);
    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      return null;
    }
    const device = this.desktopDevices.get(session.deviceId);
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

  async updateDesktopDeviceStatus(
    deviceId: string,
    status: WorkStatus,
    currentApp?: string,
    currentWindowTitle?: string
  ): Promise<void> {
    const d = this.desktopDevices.get(deviceId);
    if (d) {
      d.currentStatus = status;
      d.lastContactAt = new Date().toISOString();
      if (currentApp !== undefined) d.currentApp = currentApp;
      if (currentWindowTitle !== undefined) d.currentWindowTitle = currentWindowTitle;
      d.updatedAt = new Date().toISOString();
      this.saveToDisk();
    }
  }

  async ingestDesktopActivity(
    orgId: string,
    deviceId: string,
    employeeId: string,
    slots: IngestDesktopActivityDto[]
  ): Promise<{ inserted: number }> {
    let inserted = 0;
    const now = new Date().toISOString();
    for (const s of slots) {
      const slot: DesktopActivitySlot = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        deviceId,
        employeeId,
        startedAt: s.startedAt,
        durationSeconds: s.durationSeconds,
        processName: s.processName,
        windowTitle: s.windowTitle,
        category: s.category,
        isIdle: s.isIdle,
        idleSeconds: s.idleSeconds,
        createdAt: now
      };
      this.desktopActivitySlots.push(slot);
      inserted++;
    }
    const dev = this.desktopDevices.get(deviceId);
    if (dev) {
      dev.lastSyncAt = now;
      dev.lastContactAt = now;
      this.desktopDevices.set(deviceId, dev);
    }
    this.saveToDisk();
    return { inserted };
  }

  async recordDesktopClockEvent(data: {
    organizationId: string;
    employeeId: string;
    deviceId?: string;
    type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
    note?: string;
  }): Promise<DesktopClockEvent> {
    const evt: DesktopClockEvent = {
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      deviceId: data.deviceId,
      type: data.type,
      timestamp: new Date().toISOString(),
      note: data.note
    };
    this.desktopClockEvents.push(evt);
    if (data.deviceId) {
      const statusMap: Record<string, WorkStatus> = {
        CLOCK_IN: 'WORKING',
        CLOCK_OUT: 'OFFLINE',
        BREAK_START: 'ON_BREAK',
        BREAK_END: 'WORKING'
      };
      await this.updateDesktopDeviceStatus(data.deviceId, statusMap[data.type] || 'WORKING');
    }
    this.saveToDisk();
    return evt;
  }

  async getProductivityOverview(
    orgId: string,
    startDate?: Date,
    endDate?: Date,
    teamId?: string
  ): Promise<ProductivityOverviewResponse> {
    const members = await this.getOrgMembers(orgId);
    const filteredMembers = teamId ? members.filter(m => m.teamId === teamId) : members;

    // Filter calls for this org and period
    let calls = Array.from(this.callEvents.values()).filter(c => c.organizationId === orgId);
    if (startDate) calls = calls.filter(c => new Date(c.startedAt) >= startDate);
    if (endDate) calls = calls.filter(c => new Date(c.startedAt) <= endDate);

    // Filter desktop slots
    let slots = this.desktopActivitySlots.filter(s => s.organizationId === orgId);
    if (startDate) slots = slots.filter(s => new Date(s.startedAt) >= startDate);
    if (endDate) slots = slots.filter(s => new Date(s.startedAt) <= endDate);

    const employeeSummaries: EmployeeProductivitySummary[] = [];
    const now = Date.now();

    let totalCompanyTalkTimeSeconds = 0;
    let totalCompanyDesktopActiveSeconds = 0;
    let totalCompanyIdleSeconds = 0;
    let totalCompanyProductiveSeconds = 0;
    let totalCompanyUnproductiveSeconds = 0;
    let totalCompanyNeutralSeconds = 0;
    let activeNowCount = 0;

    for (const m of filteredMembers) {
      const empCalls = calls.filter(c => c.employeeId === m.id);
      const empSlots = slots.filter(s => s.employeeId === m.id);
      const empDev = Array.from(this.desktopDevices.values()).find(d => d.employeeId === m.id && d.status === 'ACTIVE');

      // Mobile metrics
      const mobileCallsCount = empCalls.length;
      let mobileTalkTimeSeconds = 0;
      let mobileAnsweredCalls = 0;
      for (const c of empCalls) {
        if (c.outcome === 'ANSWERED') {
          mobileAnsweredCalls++;
          mobileTalkTimeSeconds += c.durationSeconds;
        }
      }

      // Desktop metrics
      let desktopActiveSeconds = 0;
      let desktopIdleSeconds = 0;
      let desktopProductiveSeconds = 0;
      let desktopUnproductiveSeconds = 0;
      let desktopNeutralSeconds = 0;

      const appMap = new Map<string, { duration: number; category: ActivityCategory }>();

      for (const s of empSlots) {
        if (s.isIdle) {
          desktopIdleSeconds += s.durationSeconds;
        } else {
          desktopActiveSeconds += s.durationSeconds;
          if (s.category === 'PRODUCTIVE') desktopProductiveSeconds += s.durationSeconds;
          else if (s.category === 'UNPRODUCTIVE') desktopUnproductiveSeconds += s.durationSeconds;
          else desktopNeutralSeconds += s.durationSeconds;

          const key = s.processName || 'Other';
          const existing = appMap.get(key) || { duration: 0, category: s.category };
          existing.duration += s.durationSeconds;
          appMap.set(key, existing);
        }
      }

      // Live status
      let currentStatus: WorkStatus = 'OFFLINE';
      if (empDev && empDev.lastContactAt) {
        const diffMinutes = (now - new Date(empDev.lastContactAt).getTime()) / 60000;
        if (diffMinutes <= 5) {
          currentStatus = empDev.currentStatus || 'WORKING';
          if (currentStatus === 'WORKING' || currentStatus === 'IDLE' || currentStatus === 'ON_BREAK') {
            activeNowCount++;
          }
        }
      }

      // Combined Productivity Score
      // Mobile talk time is 100% productive business calling
      // Desktop productive apps are 100%, neutral apps are 50%
      const productiveVolume = mobileTalkTimeSeconds + desktopProductiveSeconds + Math.round(desktopNeutralSeconds * 0.5);
      const totalVolume = mobileTalkTimeSeconds + desktopActiveSeconds + desktopIdleSeconds;
      let productivityScore = 0;
      if (totalVolume > 0) {
        productivityScore = Math.min(100, Math.max(0, Math.round((productiveVolume / totalVolume) * 100)));
      } else if (mobileCallsCount > 0) {
        productivityScore = 75; // Active telecaller with call volume
      }

      // Top Applications
      const topApplications = Array.from(appMap.entries())
        .map(([name, val]) => ({
          name,
          durationSeconds: val.duration,
          category: val.category,
          percentage: desktopActiveSeconds > 0 ? Math.round((val.duration / desktopActiveSeconds) * 100) : 0
        }))
        .sort((a, b) => b.durationSeconds - a.durationSeconds)
        .slice(0, 5);

      // Timeline (hourly 09:00 - 18:00 or active hours)
      const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
      const timeline = hours.map(h => {
        const hourNum = parseInt(h.split(':')[0], 10);
        const slotCalls = empCalls.filter(c => {
          const d = new Date(c.startedAt);
          return d.getHours() === hourNum;
        });
        const slotSlots = empSlots.filter(s => {
          const d = new Date(s.startedAt);
          return d.getHours() === hourNum;
        });

        const talkSecs = slotCalls.filter(c => c.outcome === 'ANSWERED').reduce((a, b) => a + b.durationSeconds, 0);
        const actSecs = slotSlots.filter(s => !s.isIdle).reduce((a, b) => a + b.durationSeconds, 0);
        const idleSecs = slotSlots.filter(s => s.isIdle).reduce((a, b) => a + b.durationSeconds, 0);

        let cat: ActivityCategory | 'CALL' | 'IDLE' | 'INACTIVE' = 'INACTIVE';
        if (talkSecs > 120) cat = 'CALL';
        else if (actSecs > 120) cat = 'PRODUCTIVE';
        else if (idleSecs > 120) cat = 'IDLE';

        return {
          timeSlot: h,
          mobileTalkSeconds: talkSecs,
          desktopActiveSeconds: actSecs,
          desktopIdleSeconds: idleSecs,
          category: cat
        };
      });

      totalCompanyTalkTimeSeconds += mobileTalkTimeSeconds;
      totalCompanyDesktopActiveSeconds += desktopActiveSeconds;
      totalCompanyIdleSeconds += desktopIdleSeconds;
      totalCompanyProductiveSeconds += desktopProductiveSeconds;
      totalCompanyUnproductiveSeconds += desktopUnproductiveSeconds;
      totalCompanyNeutralSeconds += desktopNeutralSeconds;

      employeeSummaries.push({
        employeeId: m.id,
        employeeName: m.user?.fullName || 'Telecaller',
        teamName: m.team?.name,
        role: m.role,
        mobileCallsCount,
        mobileTalkTimeSeconds,
        mobileAnsweredCalls,
        desktopActiveSeconds,
        desktopIdleSeconds,
        desktopBreakSeconds: 0,
        desktopProductiveSeconds,
        desktopUnproductiveSeconds,
        desktopNeutralSeconds,
        desktopTotalWorkSeconds: desktopActiveSeconds + desktopIdleSeconds,
        productivityScore,
        currentStatus,
        currentApp: empDev?.currentApp,
        currentWindowTitle: empDev?.currentWindowTitle,
        lastActiveAt: empDev?.lastContactAt || m.user?.updatedAt,
        topApplications,
        timeline
      });
    }

    // Sort employees by productivity score & talk time
    employeeSummaries.sort((a, b) => b.productivityScore - a.productivityScore || b.mobileTalkTimeSeconds - a.mobileTalkTimeSeconds);

    const scoredCount = employeeSummaries.filter(e => e.productivityScore > 0).length;
    const avgScore = scoredCount > 0 ? Math.round(employeeSummaries.reduce((a, b) => a + b.productivityScore, 0) / scoredCount) : 0;

    return {
      totalEmployeesTracked: filteredMembers.length,
      activeNowCount,
      avgProductivityScore: avgScore,
      totalCompanyTalkTimeSeconds,
      totalCompanyDesktopActiveSeconds,
      totalCompanyIdleSeconds,
      categoryBreakdown: {
        productiveSeconds: totalCompanyProductiveSeconds,
        unproductiveSeconds: totalCompanyUnproductiveSeconds,
        neutralSeconds: totalCompanyNeutralSeconds,
        idleSeconds: totalCompanyIdleSeconds,
        callSeconds: totalCompanyTalkTimeSeconds
      },
      employees: employeeSummaries
    };
  }

  async getEmployeeProductivity(
    orgId: string,
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EmployeeProductivitySummary | null> {
    const overview = await this.getProductivityOverview(orgId, startDate, endDate);
    return overview.employees.find(e => e.employeeId === employeeId) || null;
  }

  // Pillar 1 & 2: Calling Campaigns & Power Dialer
  async getCallingCampaigns(orgId: string): Promise<CallingCampaign[]> {
    return Array.from(this.callingCampaigns.values())
      .filter(c => c.organizationId === orgId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCallingCampaignById(orgId: string, campaignId: string): Promise<CallingCampaign | null> {
    const campaign = this.callingCampaigns.get(campaignId);
    if (!campaign || campaign.organizationId !== orgId) return null;
    return campaign;
  }

  async createCallingCampaign(
    orgId: string,
    data: {
      name: string;
      description?: string;
      assignedEmployeeIds?: string[];
      leads: Array<{ name: string; phoneNumber: string; company?: string }>;
    }
  ): Promise<CallingCampaign> {
    const id = crypto.randomUUID();
    const leads: CampaignLead[] = data.leads.map((l, idx) => ({
      id: crypto.randomUUID(),
      campaignId: id,
      name: l.name,
      phoneNumber: l.phoneNumber,
      company: l.company,
      status: 'PENDING',
      attempts: 0
    }));

    const campaign: CallingCampaign = {
      id,
      organizationId: orgId,
      name: data.name,
      description: data.description,
      assignedEmployeeIds: data.assignedEmployeeIds || [],
      status: 'ACTIVE',
      totalLeads: leads.length,
      dialedLeads: 0,
      connectedLeads: 0,
      leads,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.callingCampaigns.set(id, campaign);
    this.saveToDisk();
    return campaign;
  }

  async updateCallingCampaign(orgId: string, campaignId: string, data: Partial<CallingCampaign>): Promise<CallingCampaign | null> {
    const campaign = await this.getCallingCampaignById(orgId, campaignId);
    if (!campaign) return null;

    const updated: CallingCampaign = {
      ...campaign,
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (updated.leads) {
      updated.totalLeads = updated.leads.length;
      updated.dialedLeads = updated.leads.filter(l => l.status !== 'PENDING').length;
      updated.connectedLeads = updated.leads.filter(l => l.status === 'CONNECTED').length;
    }

    this.callingCampaigns.set(campaignId, updated);
    this.saveToDisk();
    return updated;
  }

  async updateCampaignLead(orgId: string, campaignId: string, leadId: string, data: Partial<CampaignLead>): Promise<CampaignLead | null> {
    const campaign = await this.getCallingCampaignById(orgId, campaignId);
    if (!campaign) return null;

    const leadIndex = campaign.leads.findIndex(l => l.id === leadId);
    if (leadIndex === -1) return null;

    const updatedLead: CampaignLead = {
      ...campaign.leads[leadIndex],
      ...data
    };

    campaign.leads[leadIndex] = updatedLead;
    campaign.dialedLeads = campaign.leads.filter(l => l.status !== 'PENDING').length;
    campaign.connectedLeads = campaign.leads.filter(l => l.status === 'CONNECTED').length;
    campaign.updatedAt = new Date().toISOString();

    this.callingCampaigns.set(campaignId, campaign);
    this.saveToDisk();
    return updatedLead;
  }

  // Pillar 2: WhatsApp Templates
  async getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    return Array.from(this.whatsAppTemplates.values());
  }

  // Pillar 5: Webhooks & 2-Way CRM Sync
  async getWebhooks(orgId: string): Promise<WebhookConfig[]> {
    return Array.from(this.webhooks.values()).filter(w => w.organizationId === orgId);
  }

  async createWebhook(orgId: string, data: { url: string; events: string[]; secret?: string }): Promise<WebhookConfig> {
    const id = crypto.randomUUID();
    const webhook: WebhookConfig = {
      id,
      organizationId: orgId,
      url: data.url,
      events: data.events || ['call.completed', 'recording.analyzed', 'lead.qualified'],
      secret: data.secret || crypto.randomBytes(16).toString('hex'),
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.webhooks.set(id, webhook);
    this.saveToDisk();
    return webhook;
  }

  async deleteWebhook(orgId: string, webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.organizationId !== orgId) return false;
    this.webhooks.delete(webhookId);
    this.saveToDisk();
    return true;
  }

  // Haversine formula distance calculation in kilometers
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 100) / 100;
  }

  async recordAttendanceCheckIn(data: {
    organizationId: string;
    employeeId: string;
    latitude: number;
    longitude: number;
    address?: string;
    batteryLevel?: number;
    isMock?: boolean;
    remarks?: string;
  }): Promise<AttendanceRecord> {
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = Array.from(this.attendances.values()).find(
      a => a.organizationId === data.organizationId &&
           a.employeeId === data.employeeId &&
           a.checkInTime.startsWith(todayStr)
    );

    const mem = this.memberships.get(data.employeeId);
    const profile = mem ? this.profiles.get(mem.userId) : null;
    const employeeName = profile?.fullName || 'Field Agent';

    if (existing && existing.status === 'CHECKED_IN') {
      return existing;
    }

    const id = existing ? existing.id : crypto.randomUUID();
    const record: AttendanceRecord = {
      id,
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      employeeName,
      checkInTime: new Date().toISOString(),
      checkInLat: data.latitude,
      checkInLng: data.longitude,
      checkInAddress: data.address || 'Field Territory Start Point',
      checkInBattery: data.batteryLevel ?? 95,
      status: 'CHECKED_IN',
      totalDistanceKm: existing?.totalDistanceKm || 0,
      totalDurationMinutes: 0,
      isMockDetected: data.isMock || false,
      remarks: data.remarks,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.attendances.set(id, record);

    // Initial breadcrumb ping
    this.locationPings.push({
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      employeeName,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: 5,
      speed: 0,
      heading: 0,
      batteryLevel: data.batteryLevel ?? 95,
      isMockLocation: data.isMock || false,
      activityType: 'STILL',
      timestamp: record.checkInTime,
      address: record.checkInAddress
    });

    this.saveToDisk();
    return record;
  }

  async recordAttendanceCheckOut(data: {
    organizationId: string;
    employeeId: string;
    latitude: number;
    longitude: number;
    address?: string;
    batteryLevel?: number;
    isMock?: boolean;
    remarks?: string;
  }): Promise<AttendanceRecord> {
    const todayStr = new Date().toISOString().split('T')[0];
    let record = Array.from(this.attendances.values()).find(
      a => a.organizationId === data.organizationId &&
           a.employeeId === data.employeeId &&
           a.checkInTime.startsWith(todayStr)
    );

    const mem = this.memberships.get(data.employeeId);
    const profile = mem ? this.profiles.get(mem.userId) : null;
    const employeeName = profile?.fullName || 'Field Agent';

    const checkOutTime = new Date().toISOString();
    let totalMinutes = 0;
    if (record) {
      const checkInMs = new Date(record.checkInTime).getTime();
      const checkOutMs = new Date(checkOutTime).getTime();
      totalMinutes = Math.max(1, Math.round((checkOutMs - checkInMs) / 60000));
    }

    // Calculate total distance traveled today
    const employeePings = this.locationPings
      .filter(p => p.organizationId === data.organizationId && p.employeeId === data.employeeId && p.timestamp.startsWith(todayStr))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let distanceKm = 0;
    for (let i = 1; i < employeePings.length; i++) {
      distanceKm += this.calculateDistanceKm(
        employeePings[i - 1].latitude,
        employeePings[i - 1].longitude,
        employeePings[i].latitude,
        employeePings[i].longitude
      );
    }
    distanceKm = Math.round(distanceKm * 10) / 10;

    const id = record ? record.id : crypto.randomUUID();
    record = {
      id,
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      employeeName,
      checkInTime: record ? record.checkInTime : new Date(Date.now() - 8 * 3600000).toISOString(),
      checkInLat: record ? record.checkInLat : data.latitude,
      checkInLng: record ? record.checkInLng : data.longitude,
      checkInAddress: record ? record.checkInAddress : 'Field Office / Client Territory',
      checkInBattery: record ? record.checkInBattery : 95,
      checkOutTime,
      checkOutLat: data.latitude,
      checkOutLng: data.longitude,
      checkOutAddress: data.address || 'Field Shift End Point',
      checkOutBattery: data.batteryLevel ?? 25,
      status: 'CHECKED_OUT',
      totalDurationMinutes: totalMinutes || 480,
      totalDistanceKm: Math.max(distanceKm, record?.totalDistanceKm || 0),
      isMockDetected: data.isMock || record?.isMockDetected || false,
      remarks: data.remarks || record?.remarks,
      createdAt: record?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.attendances.set(id, record);

    // End ping
    this.locationPings.push({
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      employeeName,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: 5,
      speed: 0,
      heading: 0,
      batteryLevel: data.batteryLevel ?? 25,
      isMockLocation: data.isMock || false,
      activityType: 'STILL',
      timestamp: checkOutTime,
      address: record.checkOutAddress
    });

    this.saveToDisk();
    return record;
  }

  async getAttendanceHistory(
    orgId: string,
    filters?: { employeeId?: string; startDate?: string; endDate?: string }
  ): Promise<AttendanceRecord[]> {
    let list = Array.from(this.attendances.values()).filter(a => a.organizationId === orgId);
    if (filters?.employeeId) {
      list = list.filter(a => a.employeeId === filters.employeeId);
    }
    if (filters?.startDate) {
      list = list.filter(a => a.checkInTime >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter(a => a.checkInTime <= filters.endDate!);
    }
    list.forEach(a => {
      if (!a.employeeName) {
        const mem = this.memberships.get(a.employeeId);
        const prof = mem ? this.profiles.get(mem.userId) : null;
        a.employeeName = prof?.fullName || 'Field Agent';
      }
    });
    return list.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  }

  async recordLocationPings(
    orgId: string,
    employeeId: string,
    pings: Array<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      batteryLevel?: number;
      isCharging?: boolean;
      isMockLocation?: boolean;
      activityType?: 'STILL' | 'WALKING' | 'IN_VEHICLE' | 'UNKNOWN';
      timestamp?: string;
      address?: string;
    }>
  ): Promise<{ inserted: number }> {
    const mem = this.memberships.get(employeeId);
    const prof = mem ? this.profiles.get(mem.userId) : null;
    const employeeName = prof?.fullName || 'Field Agent';

    let inserted = 0;
    for (const p of pings) {
      const ping: LocationPing = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        employeeId,
        employeeName,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy ?? 5,
        speed: p.speed ?? 0,
        heading: p.heading ?? 0,
        altitude: p.altitude ?? 0,
        batteryLevel: p.batteryLevel ?? 80,
        isCharging: p.isCharging ?? false,
        isMockLocation: p.isMockLocation ?? false,
        activityType: p.activityType ?? (p.speed && p.speed > 15 ? 'IN_VEHICLE' : p.speed && p.speed > 2 ? 'WALKING' : 'STILL'),
        timestamp: p.timestamp || new Date().toISOString(),
        address: p.address
      };
      this.locationPings.push(ping);
      inserted++;
    }

    this.saveToDisk();
    return { inserted };
  }

  async recordClientVisit(data: {
    organizationId: string;
    employeeId: string;
    clientName: string;
    phoneNumber?: string;
    companyName?: string;
    visitTime?: string;
    latitude: number;
    longitude: number;
    address?: string;
    outcome: ClientVisitOutcome;
    notes?: string;
    photoUrl?: string;
    durationMinutes?: number;
  }): Promise<ClientVisit> {
    const mem = this.memberships.get(data.employeeId);
    const prof = mem ? this.profiles.get(mem.userId) : null;
    const employeeName = prof?.fullName || 'Field Agent';

    const id = crypto.randomUUID();
    const visit: ClientVisit = {
      id,
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      employeeName,
      clientName: data.clientName,
      phoneNumber: data.phoneNumber,
      companyName: data.companyName,
      visitTime: data.visitTime || new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || 'Client Office Location',
      outcome: data.outcome,
      notes: data.notes,
      photoUrl: data.photoUrl,
      durationMinutes: data.durationMinutes || 30,
      createdAt: new Date().toISOString()
    };
    this.clientVisits.set(id, visit);
    this.saveToDisk();
    return visit;
  }

  async getClientVisits(
    orgId: string,
    filters?: { employeeId?: string; date?: string }
  ): Promise<ClientVisit[]> {
    let list = Array.from(this.clientVisits.values()).filter(v => v.organizationId === orgId);
    if (filters?.employeeId) {
      list = list.filter(v => v.employeeId === filters.employeeId);
    }
    if (filters?.date) {
      list = list.filter(v => v.visitTime.startsWith(filters.date!));
    }
    list.forEach(v => {
      if (!v.employeeName) {
        const mem = this.memberships.get(v.employeeId);
        const prof = mem ? this.profiles.get(mem.userId) : null;
        v.employeeName = prof?.fullName || 'Field Agent';
      }
    });
    return list.sort((a, b) => new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime());
  }

  async getLiveAgentLocations(orgId: string): Promise<LiveAgentLocation[]> {
    const members = Array.from(this.memberships.values()).filter(m => m.organizationId === orgId && m.isActive);
    const todayStr = new Date().toISOString().split('T')[0];
    const result: LiveAgentLocation[] = [];

    for (const mem of members) {
      const prof = this.profiles.get(mem.userId);
      const team = mem.teamId ? this.teams.get(mem.teamId) : null;
      const employeeName = prof?.fullName || 'Field Agent';

      // Find attendance today
      const todayAttendance = Array.from(this.attendances.values()).find(
        a => a.organizationId === orgId && a.employeeId === mem.id && a.checkInTime.startsWith(todayStr)
      );

      // Find today's pings for this employee
      const pings = this.locationPings
        .filter(p => p.organizationId === orgId && p.employeeId === mem.id && p.timestamp.startsWith(todayStr))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const lastPing = pings.length > 0 ? pings[pings.length - 1] : undefined;

      // Calculate distance today
      let todayDistanceKm = 0;
      for (let i = 1; i < pings.length; i++) {
        todayDistanceKm += this.calculateDistanceKm(
          pings[i - 1].latitude,
          pings[i - 1].longitude,
          pings[i].latitude,
          pings[i].longitude
        );
      }
      if (todayAttendance?.totalDistanceKm && todayAttendance.totalDistanceKm > todayDistanceKm) {
        todayDistanceKm = todayAttendance.totalDistanceKm;
      }
      todayDistanceKm = Math.round(todayDistanceKm * 10) / 10;

      // Count visits today
      const todayVisits = Array.from(this.clientVisits.values()).filter(
        v => v.organizationId === orgId && v.employeeId === mem.id && v.visitTime.startsWith(todayStr)
      );

      const status: AttendanceStatus = todayAttendance?.status || 'CHECKED_OUT';
      const isOnline = status === 'CHECKED_IN';

      result.push({
        employeeId: mem.id,
        employeeName,
        employeeCode: mem.employeeCode,
        avatarUrl: prof?.avatarUrl,
        teamName: team?.name || 'Field Sales',
        attendanceStatus: status,
        checkInTime: todayAttendance?.checkInTime,
        lastPing,
        todayDistanceKm,
        todayVisitsCount: todayVisits.length,
        isOnline,
        currentSpeedKmH: lastPing?.speed || 0,
        batteryLevel: lastPing?.batteryLevel || todayAttendance?.checkInBattery || 85
      });
    }

    return result;
  }

  async getFieldTrackingSummary(orgId: string): Promise<FieldTrackingSummary> {
    const agents = await this.getLiveAgentLocations(orgId);
    const todayStr = new Date().toISOString().split('T')[0];
    const totalVisits = Array.from(this.clientVisits.values()).filter(
      v => v.organizationId === orgId && v.visitTime.startsWith(todayStr)
    ).length;

    const totalDistance = Math.round(agents.reduce((sum, a) => sum + a.todayDistanceKm, 0) * 10) / 10;
    const activeOnDuty = agents.filter(a => a.attendanceStatus === 'CHECKED_IN').length;

    return {
      totalFieldAgents: agents.length,
      activeOnDuty,
      totalDistanceTraveledKm: totalDistance,
      totalClientVisits: totalVisits,
      agents
    };
  }

  async getAgentRoute(
    orgId: string,
    employeeId: string,
    dateStr?: string
  ): Promise<{
    employeeId: string;
    employeeName: string;
    date: string;
    totalDistanceKm: number;
    pings: LocationPing[];
    visits: ClientVisit[];
    attendance?: AttendanceRecord;
  }> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const mem = this.memberships.get(employeeId);
    const prof = mem ? this.profiles.get(mem.userId) : null;
    const employeeName = prof?.fullName || 'Field Agent';

    const pings = this.locationPings
      .filter(p => p.organizationId === orgId && p.employeeId === employeeId && p.timestamp.startsWith(targetDate))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalDistanceKm = 0;
    for (let i = 1; i < pings.length; i++) {
      totalDistanceKm += this.calculateDistanceKm(
        pings[i - 1].latitude,
        pings[i - 1].longitude,
        pings[i].latitude,
        pings[i].longitude
      );
    }

    const attendance = Array.from(this.attendances.values()).find(
      a => a.organizationId === orgId && a.employeeId === employeeId && a.checkInTime.startsWith(targetDate)
    );

    if (attendance?.totalDistanceKm && attendance.totalDistanceKm > totalDistanceKm) {
      totalDistanceKm = attendance.totalDistanceKm;
    }
    totalDistanceKm = Math.round(totalDistanceKm * 10) / 10;

    const visits = Array.from(this.clientVisits.values()).filter(
      v => v.organizationId === orgId && v.employeeId === employeeId && v.visitTime.startsWith(targetDate)
    ).sort((a, b) => new Date(a.visitTime).getTime() - new Date(b.visitTime).getTime());

    return {
      employeeId,
      employeeName,
      date: targetDate,
      totalDistanceKm,
      pings,
      visits,
      attendance
    };
  }

  public ensurePillarDataSeeded() {
    // 1. WhatsApp Templates
    if (this.whatsAppTemplates.size === 0) {
      const templates: WhatsAppTemplate[] = [
        {
          id: 'tmpl-quotation',
          name: 'Commercial Quotation & Brochure',
          category: 'QUOTATION',
          title: 'Quotation & Enterprise Specs',
          templateText: 'Hi {{name}}, thank you for speaking with {{callerName}} from TeleTrack. As discussed, please find our product brochure and enterprise pricing quotation here: {{link}}. Let us know if you have any questions!'
        },
        {
          id: 'tmpl-followup',
          name: 'Demo Call Confirmation',
          category: 'FOLLOW_UP',
          title: 'Meeting Confirmation',
          templateText: 'Hi {{name}}, it was a pleasure speaking with you today. Per our discussion, we have scheduled your live product demo for {{time}}. Looking forward to walking you through TeleTrack!'
        },
        {
          id: 'tmpl-missed',
          name: 'Missed Call Follow-up',
          category: 'MISSED_CALL',
          title: 'Missed Call Apology & Direct Link',
          templateText: 'Hi {{name}}, I tried reaching you from TeleTrack regarding our telecaller productivity tracking platform. Sorry I missed you! You can reply to this message directly or schedule a callback here: {{link}}'
        },
        {
          id: 'tmpl-brochure',
          name: 'APK Download & Credentials',
          category: 'BROCHURE',
          title: 'Android & Desktop Downloads',
          templateText: 'Hi {{name}}, here are the download links for TeleTrack: Android APK: {{apkUrl}} | Windows Desktop Agent: {{desktopUrl}}. Your trial organization code is {{orgSlug}}. Feel free to test it with your team!'
        }
      ];
      templates.forEach(t => this.whatsAppTemplates.set(t.id, t));
    }

    // 2. Calling Campaigns
    if (this.callingCampaigns.size === 0) {
      const defaultOrgId = '33333333-3333-3333-3333-333333333301';
      const c1Id = '44444444-4444-4444-4444-444444444401';
      const c1Leads: CampaignLead[] = [
        {
          id: 'lead-c1-01',
          campaignId: c1Id,
          name: 'Rajesh Singhania',
          phoneNumber: '+91-98201-12345',
          company: 'TechCorp India',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c1-02',
          campaignId: c1Id,
          name: 'Ananya Sharma',
          phoneNumber: '+91-98112-23344',
          company: 'Horizon Media Labs',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c1-03',
          campaignId: c1Id,
          name: 'Vikram Malhotra',
          phoneNumber: '+91-98776-65544',
          company: 'Apex Logistics Ltd',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c1-04',
          campaignId: c1Id,
          name: 'Sunita Reddy',
          phoneNumber: '+91-98443-32211',
          company: 'BlueChip FinTech',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c1-05',
          campaignId: c1Id,
          name: 'Karan Mehta',
          phoneNumber: '+91-98334-45566',
          company: 'Zen Global Retailers',
          status: 'PENDING',
          attempts: 0
        }
      ];

      const campaign1: CallingCampaign = {
        id: c1Id,
        organizationId: defaultOrgId,
        name: 'Q4 High-Touch Enterprise Outbound',
        description: 'Targeting mid-size BPO and telesales operations (10-50 callers) for SIM recording and desktop tracking.',
        assignedEmployeeIds: [
          '22222222-2222-2222-2222-222222222203', // Rahul Verma
          '22222222-2222-2222-2222-222222222204'  // Sneha Rao
        ],
        status: 'ACTIVE',
        totalLeads: c1Leads.length,
        dialedLeads: 0,
        connectedLeads: 0,
        leads: c1Leads,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.callingCampaigns.set(c1Id, campaign1);

      const c2Id = '44444444-4444-4444-4444-444444444402';
      const c2Leads: CampaignLead[] = [
        {
          id: 'lead-c2-01',
          campaignId: c2Id,
          name: 'Amit Verma',
          phoneNumber: '+91-98901-23456',
          company: 'Prime Global Ventures',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c2-02',
          campaignId: c2Id,
          name: 'Pooja Kapoor',
          phoneNumber: '+91-98765-43210',
          company: 'Zenith Teleservices',
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'lead-c2-03',
          campaignId: c2Id,
          name: 'Nitin Desai',
          phoneNumber: '+91-98234-56789',
          company: 'Bright Spark Solutions',
          status: 'PENDING',
          attempts: 0
        }
      ];

      const campaign2: CallingCampaign = {
        id: c2Id,
        organizationId: defaultOrgId,
        name: 'Inbound Trial Signups Follow-up',
        description: 'Warm inbound trial accounts that downloaded the Android APK in the last 48 hours.',
        assignedEmployeeIds: [
          '22222222-2222-2222-2222-222222222203'
        ],
        status: 'ACTIVE',
        totalLeads: c2Leads.length,
        dialedLeads: 0,
        connectedLeads: 0,
        leads: c2Leads,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.callingCampaigns.set(c2Id, campaign2);
    }

    // 3. Webhooks
    if (this.webhooks.size === 0) {
      const defaultOrgId = '33333333-3333-3333-3333-333333333301';
      const zapierWebhook: WebhookConfig = {
        id: 'webhook-zapier-01',
        organizationId: defaultOrgId,
        url: 'https://hooks.zapier.com/hooks/catch/1982345/teletrack-crm-sync',
        events: ['call.completed', 'recording.analyzed', 'lead.qualified'],
        secret: 'whsec_teletrack_live_sync_2026',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      this.webhooks.set(zapierWebhook.id, zapierWebhook);
    }

    // 4. TrackHR Field Tracking, Attendance & Visits
    if (this.attendances.size === 0) {
      const defaultOrgId = '33333333-3333-3333-3333-333333333301';
      const todayStr = new Date().toISOString().split('T')[0];

      // 4A. Rahul Verma (Active Field Sales Executive)
      const rahulEmpId = '66666666-6666-6666-6666-666666666603';
      const rahulAttId = 'att-rahul-today';
      const rahulAtt: AttendanceRecord = {
        id: rahulAttId,
        organizationId: defaultOrgId,
        employeeId: rahulEmpId,
        employeeName: 'Rahul Verma',
        checkInTime: `${todayStr}T09:15:00.000Z`,
        checkInLat: 12.9344,
        checkInLng: 77.6190,
        checkInAddress: 'Koramangala 4th Block, Bengaluru',
        checkInBattery: 95,
        status: 'CHECKED_IN',
        totalDurationMinutes: 380,
        totalDistanceKm: 22.4,
        isMockDetected: false,
        remarks: 'Field client visits in South Bengaluru sector',
        createdAt: `${todayStr}T09:15:00.000Z`,
        updatedAt: new Date().toISOString()
      };
      this.attendances.set(rahulAttId, rahulAtt);

      const rahulPings: LocationPing[] = [
        { id: 'ping-r-1', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9344, longitude: 77.6190, accuracy: 4, speed: 0, heading: 0, batteryLevel: 95, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T09:15:00.000Z`, address: 'Koramangala 4th Block' },
        { id: 'ping-r-2', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9482, longitude: 77.6251, accuracy: 5, speed: 34, heading: 45, batteryLevel: 93, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T09:40:00.000Z`, address: 'Sony World Signal, Koramangala' },
        { id: 'ping-r-3', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9610, longitude: 77.6387, accuracy: 6, speed: 42, heading: 60, batteryLevel: 91, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T10:00:00.000Z`, address: 'Domlur Intermediate Ring Rd' },
        { id: 'ping-r-4', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9784, longitude: 77.6408, accuracy: 3, speed: 0, heading: 12, batteryLevel: 88, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T10:25:00.000Z`, address: '100ft Road, Indiranagar' },
        { id: 'ping-r-5', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9754, longitude: 77.6066, accuracy: 5, speed: 28, heading: 270, batteryLevel: 82, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T12:00:00.000Z`, address: 'MG Road Metro Boulevard' },
        { id: 'ping-r-6', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9745, longitude: 77.6015, accuracy: 4, speed: 0, heading: 180, batteryLevel: 79, isMockLocation: false, activityType: 'WALKING', timestamp: `${todayStr}T13:10:00.000Z`, address: 'Church Street Commercial Complex' },
        { id: 'ping-r-7', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9553, longitude: 77.5929, accuracy: 6, speed: 31, heading: 195, batteryLevel: 74, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T15:00:00.000Z`, address: 'Shanthi Nagar Double Road' },
        { id: 'ping-r-8', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9298, longitude: 77.5843, accuracy: 4, speed: 0, heading: 90, batteryLevel: 68, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T16:15:00.000Z`, address: 'Jayanagar 4th Block Shopping Complex' },
        { id: 'ping-r-9', organizationId: defaultOrgId, employeeId: rahulEmpId, employeeName: 'Rahul Verma', latitude: 12.9166, longitude: 77.6101, accuracy: 5, speed: 18, heading: 110, batteryLevel: 63, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T17:30:00.000Z`, address: 'BTM Layout 2nd Stage' }
      ];
      this.locationPings.push(...rahulPings);

      const rahulVisits: ClientVisit[] = [
        {
          id: 'visit-r-1',
          organizationId: defaultOrgId,
          employeeId: rahulEmpId,
          employeeName: 'Rahul Verma',
          clientName: 'Suresh Menon',
          companyName: 'Nexus FinTech Labs',
          phoneNumber: '+91-98450-11223',
          visitTime: `${todayStr}T10:30:00.000Z`,
          latitude: 12.9784,
          longitude: 77.6408,
          address: 'Indiranagar 100ft Road, Suite 402',
          outcome: 'INTERESTED',
          notes: 'Met VP Operations. Interested in 50 Android field tracking licenses. Requested custom quote.',
          durationMinutes: 45,
          createdAt: `${todayStr}T10:30:00.000Z`
        },
        {
          id: 'visit-r-2',
          organizationId: defaultOrgId,
          employeeId: rahulEmpId,
          employeeName: 'Rahul Verma',
          clientName: 'Alok Gupta',
          companyName: 'CloudCraft Technologies',
          phoneNumber: '+91-98451-44556',
          visitTime: `${todayStr}T13:15:00.000Z`,
          latitude: 12.9745,
          longitude: 77.6015,
          address: 'Church Street, Brigade Towers',
          outcome: 'FOLLOW_UP_REQUIRED',
          notes: 'Demonstrated power dialer and call recordings. Follow-up demo scheduled for Friday.',
          durationMinutes: 40,
          createdAt: `${todayStr}T13:15:00.000Z`
        },
        {
          id: 'visit-r-3',
          organizationId: defaultOrgId,
          employeeId: rahulEmpId,
          employeeName: 'Rahul Verma',
          clientName: 'Manoj Kumar',
          companyName: 'Suntec Retail Distribution',
          phoneNumber: '+91-98452-77889',
          visitTime: `${todayStr}T16:20:00.000Z`,
          latitude: 12.9298,
          longitude: 77.5843,
          address: 'Jayanagar 4th Block, Metro Pillar 14',
          outcome: 'CLOSED_WON',
          notes: 'Signed contract for 12 telecallers + field agents. Advance payment approved.',
          durationMinutes: 50,
          createdAt: `${todayStr}T16:20:00.000Z`
        }
      ];
      rahulVisits.forEach(v => this.clientVisits.set(v.id, v));

      // 4B. Priya Patel (Field Team Lead)
      const priyaEmpId = '66666666-6666-6666-6666-666666666602';
      const priyaAttId = 'att-priya-today';
      const priyaAtt: AttendanceRecord = {
        id: priyaAttId,
        organizationId: defaultOrgId,
        employeeId: priyaEmpId,
        employeeName: 'Priya Patel',
        checkInTime: `${todayStr}T09:00:00.000Z`,
        checkInLat: 12.9569,
        checkInLng: 77.7011,
        checkInAddress: 'Marathahalli Bridge, Outer Ring Road',
        checkInBattery: 98,
        status: 'CHECKED_IN',
        totalDurationMinutes: 400,
        totalDistanceKm: 28.6,
        isMockDetected: false,
        remarks: 'Whitefield client tech park territory visits',
        createdAt: `${todayStr}T09:00:00.000Z`,
        updatedAt: new Date().toISOString()
      };
      this.attendances.set(priyaAttId, priyaAtt);

      const priyaPings: LocationPing[] = [
        { id: 'ping-p-1', organizationId: defaultOrgId, employeeId: priyaEmpId, employeeName: 'Priya Patel', latitude: 12.9569, longitude: 77.7011, accuracy: 4, speed: 0, heading: 0, batteryLevel: 98, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T09:00:00.000Z`, address: 'Marathahalli Bridge' },
        { id: 'ping-p-2', organizationId: defaultOrgId, employeeId: priyaEmpId, employeeName: 'Priya Patel', latitude: 12.9856, longitude: 77.7314, accuracy: 5, speed: 0, heading: 90, batteryLevel: 92, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T10:15:00.000Z`, address: 'ITPL Main Road, Whitefield' },
        { id: 'ping-p-3', organizationId: defaultOrgId, employeeId: priyaEmpId, employeeName: 'Priya Patel', latitude: 12.9984, longitude: 77.7610, accuracy: 6, speed: 25, heading: 70, batteryLevel: 86, isMockLocation: false, activityType: 'IN_VEHICLE', timestamp: `${todayStr}T13:30:00.000Z`, address: 'Kadugodi Industrial Area' },
        { id: 'ping-p-4', organizationId: defaultOrgId, employeeId: priyaEmpId, employeeName: 'Priya Patel', latitude: 12.9260, longitude: 77.6830, accuracy: 4, speed: 0, heading: 220, batteryLevel: 79, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T16:00:00.000Z`, address: 'EcoSpace Business Park, Bellandur' }
      ];
      this.locationPings.push(...priyaPings);

      const priyaVisits: ClientVisit[] = [
        {
          id: 'visit-p-1',
          organizationId: defaultOrgId,
          employeeId: priyaEmpId,
          employeeName: 'Priya Patel',
          clientName: 'Naveen Reddy',
          companyName: 'GlobalEdge Infotech',
          phoneNumber: '+91-98101-22334',
          visitTime: `${todayStr}T10:30:00.000Z`,
          latitude: 12.9856,
          longitude: 77.7314,
          address: 'ITPL Park, Tower C',
          outcome: 'INTERESTED',
          notes: 'Presented TeleTrack multi-OS integration and WhatsApp automation.',
          durationMinutes: 45,
          createdAt: `${todayStr}T10:30:00.000Z`
        },
        {
          id: 'visit-p-2',
          organizationId: defaultOrgId,
          employeeId: priyaEmpId,
          employeeName: 'Priya Patel',
          clientName: 'Karthik Balan',
          companyName: 'UrbanLogistics Corp',
          phoneNumber: '+91-98102-55667',
          visitTime: `${todayStr}T16:15:00.000Z`,
          latitude: 12.9260,
          longitude: 77.6830,
          address: 'EcoSpace, Outer Ring Road',
          outcome: 'CLOSED_WON',
          notes: 'Signed 25 driver & field staff live location tracking contract.',
          durationMinutes: 60,
          createdAt: `${todayStr}T16:15:00.000Z`
        }
      ];
      priyaVisits.forEach(v => this.clientVisits.set(v.id, v));

      // 4C. Sneha Rao (Shift Completed & Checked Out)
      const snehaEmpId = '66666666-6666-6666-6666-666666666604';
      const snehaAttId = 'att-sneha-today';
      const snehaAtt: AttendanceRecord = {
        id: snehaAttId,
        organizationId: defaultOrgId,
        employeeId: snehaEmpId,
        employeeName: 'Sneha Rao',
        checkInTime: `${todayStr}T08:45:00.000Z`,
        checkInLat: 12.9116,
        checkInLng: 77.6433,
        checkInAddress: 'HSR Layout Sector 2',
        checkInBattery: 96,
        checkOutTime: `${todayStr}T17:30:00.000Z`,
        checkOutLat: 12.9125,
        checkOutLng: 77.6440,
        checkOutAddress: 'HSR Layout Sector 1 Hub',
        checkOutBattery: 34,
        status: 'CHECKED_OUT',
        totalDurationMinutes: 525,
        totalDistanceKm: 34.2,
        isMockDetected: false,
        remarks: 'Covered Electronic City & HSR customer meetings. Shift complete.',
        createdAt: `${todayStr}T08:45:00.000Z`,
        updatedAt: `${todayStr}T17:30:00.000Z`
      };
      this.attendances.set(snehaAttId, snehaAtt);

      const snehaPings: LocationPing[] = [
        { id: 'ping-s-1', organizationId: defaultOrgId, employeeId: snehaEmpId, employeeName: 'Sneha Rao', latitude: 12.9116, longitude: 77.6433, accuracy: 4, speed: 0, heading: 0, batteryLevel: 96, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T08:45:00.000Z`, address: 'HSR Sector 2' },
        { id: 'ping-s-2', organizationId: defaultOrgId, employeeId: snehaEmpId, employeeName: 'Sneha Rao', latitude: 12.8399, longitude: 77.6770, accuracy: 5, speed: 0, heading: 180, batteryLevel: 82, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T11:00:00.000Z`, address: 'Electronic City Phase 1' },
        { id: 'ping-s-3', organizationId: defaultOrgId, employeeId: snehaEmpId, employeeName: 'Sneha Rao', latitude: 12.9125, longitude: 77.6440, accuracy: 4, speed: 0, heading: 0, batteryLevel: 34, isMockLocation: false, activityType: 'STILL', timestamp: `${todayStr}T17:30:00.000Z`, address: 'HSR Sector 1 Hub' }
      ];
      this.locationPings.push(...snehaPings);
    }
  }
}

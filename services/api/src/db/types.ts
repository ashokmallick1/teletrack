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

export interface IDatabase {
  // Profiles & Auth
  findProfileByEmail(email: string): Promise<(UserProfile & { passwordHash?: string }) | null>;
  findProfileById(id: string): Promise<UserProfile | null>;
  createProfile(profile: Partial<UserProfile> & { email: string; fullName: string; passwordHash: string }): Promise<UserProfile>;
  
  // Organizations & Memberships
  getUserMemberships(userId: string): Promise<OrganizationMembership[]>;
  getOrganizationById(orgId: string): Promise<Organization | null>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  createOrganization(data: { name: string; slug: string; timezone?: string }): Promise<Organization>;
  updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization>;
  getOrgMembers(orgId: string): Promise<OrganizationMembership[]>;
  getMembership(orgId: string, userId: string): Promise<OrganizationMembership | null>;
  createMembership(data: { organizationId: string; userId: string; role: UserRole; teamId?: string; employeeCode?: string }): Promise<OrganizationMembership>;
  
  // Teams
  getTeams(orgId: string): Promise<Team[]>;
  createTeam(data: { organizationId: string; name: string; description?: string }): Promise<Team>;

  // Devices & Sessions
  getDevices(orgId: string): Promise<Device[]>;
  getDeviceById(deviceId: string): Promise<Device | null>;
  getDeviceByIdentifier(orgId: string, deviceIdentifier: string): Promise<Device | null>;
  createEnrollmentToken(orgId: string, employeeId: string, tokenHash: string, expiresAt: Date): Promise<string>;
  verifyAndConsumeEnrollmentToken(tokenHash: string): Promise<{ organizationId: string; employeeId: string } | null>;
  registerDevice(data: {
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
  }): Promise<Device>;
  createDeviceSession(deviceId: string, apiKeyHash: string, expiresAt: Date): Promise<void>;
  findDeviceByApiKeyHash(apiKeyHash: string): Promise<Device | null>;
  updateDeviceSync(deviceId: string, permissionGranted?: boolean): Promise<void>;
  revokeDevice(deviceId: string): Promise<boolean>;

  // Call Events & Sync Batches
  createSyncBatch(batch: {
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
  }): Promise<SyncBatch>;
  
  ingestCallEvents(
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
  ): Promise<{ inserted: number; duplicates: number; errors: number }>;

  getCallEvents(
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
  ): Promise<PaginatedResult<CallEvent>>;
  
  getCallEventById(orgId: string, eventId: string): Promise<CallEvent | null>;
  clearDemoCalls(orgId: string): Promise<number>;

  // Analytics
  getAnalyticsOverview(orgId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsOverview>;
  getDailyTrends(orgId: string, startDate?: Date, endDate?: Date): Promise<DailyCallTrend[]>;
  getEmployeePerformance(orgId: string, startDate?: Date, endDate?: Date): Promise<EmployeePerformance[]>;
  getDeviceSyncHealth(orgId: string): Promise<DeviceSyncHealth[]>;

  // Leads
  getLeads(
    orgId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: LeadStatus;
      assignedEmployeeId?: string;
      search?: string;
    }
  ): Promise<PaginatedResult<Lead>>;
  getLeadById(orgId: string, leadId: string): Promise<Lead | null>;
  findLeadByPhone(orgId: string, phone: string): Promise<Lead | null>;
  createLead(data: Partial<Lead> & { organizationId: string; name: string; phoneNumber: string }): Promise<Lead>;
  updateLead(orgId: string, leadId: string, data: Partial<Lead>): Promise<Lead>;
  createLeadNote(orgId: string, leadId: string, authorId: string, note: string): Promise<LeadNote>;
  getLeadNotes(leadId: string): Promise<LeadNote[]>;
  getFollowUps(orgId: string, employeeId?: string): Promise<FollowUpTask[]>;

  // Audit Logs
  createAuditLog(log: {
    organizationId?: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    details?: any;
  }): Promise<void>;
  getAuditLogs(orgId: string, page?: number, pageSize?: number): Promise<PaginatedResult<AuditLog>>;

  // Super Admin
  getAllOrganizations(): Promise<any[]>;
  getSystemUsage(): Promise<any>;
}

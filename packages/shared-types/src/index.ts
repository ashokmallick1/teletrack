/**
 * Core domain types and API contracts for Callyzer-like Call Analytics SaaS
 */

export type UserRole = 'SUPER_ADMIN' | 'ORG_OWNER' | 'ORG_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type CallDirection = 'INCOMING' | 'OUTGOING' | 'MISSED' | 'REJECTED' | 'UNKNOWN';

export type CallOutcome = 'ANSWERED' | 'MISSED' | 'REJECTED' | 'BUSY' | 'FAILED' | 'UNKNOWN';

export type DataSource = 'NATIVE_CALL_LOG' | 'MANUAL_ENTRY' | 'CSV_IMPORT' | 'TELEPHONY_API';

export type DeviceStatus = 'PENDING_ENROLLMENT' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export type SyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  retentionDays: number;
  maskPhoneNumbers: boolean;
  maxDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  teamId?: string;
  employeeCode?: string;
  isActive: boolean;
  invitedEmail?: string;
  user?: UserProfile;
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  organizationId: string;
  employeeId: string; // references organization_memberships.id
  deviceIdentifier: string; // Hardware or persistent installation ID
  deviceName: string;
  model: string;
  manufacturer: string;
  osVersion: string;
  appVersion: string;
  status: DeviceStatus;
  lastContactAt?: string;
  lastSyncAt?: string;
  pendingEventsCount?: number;
  permissionGranted: boolean;
  simMetadata?: {
    carrierName?: string;
    simCount?: number;
    phoneAccountHandle?: string;
  };
  employee?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CallEvent {
  id: string;
  organizationId: string;
  deviceId: string;
  employeeId: string;
  sourceCallId: string; // ID assigned by device or source log
  direction: CallDirection;
  durationSeconds: number;
  startedAt: string;
  endedAt?: string;
  outcome: CallOutcome;
  outcomeConfidence: number; // 0.0 - 1.0 (1.0 for definitive answer/duration, lower if deduced)
  rawPhoneNumber: string;
  displayPhoneNumber: string; // Masked or full based on permissions
  simSlot?: number;
  simCarrier?: string;
  phoneAccount?: string;
  leadId?: string;
  dataSource: DataSource;
  syncBatchId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  
  // Joined fields
  employeeName?: string;
  deviceName?: string;
  teamName?: string;
  leadName?: string;
}

export interface SyncBatch {
  id: string;
  organizationId: string;
  deviceId: string;
  receivedCount: number;
  insertedCount: number;
  duplicateCount: number;
  errorCount: number;
  status: SyncStatus;
  clientTimestamp: string;
  serverTimestamp: string;
  errorMessage?: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  assignedEmployeeId?: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  followUpAt?: string;
  lastContactedAt?: string;
  notesCount?: number;
  totalCallsCount?: number;
  totalDurationSeconds?: number;
  assignedEmployee?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  organizationId: string;
  authorId: string;
  note: string;
  authorName?: string;
  createdAt: string;
}

export interface FollowUpTask {
  id: string;
  leadId: string;
  organizationId: string;
  assignedEmployeeId: string;
  scheduledAt: string;
  title: string;
  notes?: string;
  isCompleted: boolean;
  leadName?: string;
  leadPhone?: string;
  assignedEmployeeName?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  maxDevices: number;
  maxEmployees: number;
  retentionDays: number;
  priceMonthly: number;
  features: string[];
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan?: SubscriptionPlan;
}

// API DTOs

export interface DeviceEnrollmentRequest {
  enrollmentToken: string;
  deviceIdentifier: string;
  deviceName: string;
  model: string;
  manufacturer: string;
  osVersion: string;
  appVersion: string;
  permissionGranted: boolean;
  simMetadata?: {
    carrierName?: string;
    simCount?: number;
    phoneAccountHandle?: string;
  };
}

export interface DeviceEnrollmentResponse {
  deviceApiKey: string;
  deviceId: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  employeeName: string;
  syncIntervalMinutes: number;
}

export interface IngestCallEventDto {
  sourceCallId: string;
  direction: CallDirection;
  durationSeconds: number;
  startedAt: string;
  endedAt?: string;
  outcome: CallOutcome;
  outcomeConfidence?: number;
  phoneNumber: string;
  simSlot?: number;
  simCarrier?: string;
  phoneAccount?: string;
  dataSource: DataSource;
  metadata?: Record<string, any>;
}

export interface IngestBatchRequest {
  clientTimestamp: string;
  events: IngestCallEventDto[];
}

export interface IngestBatchResponse {
  batchId: string;
  totalReceived: number;
  inserted: number;
  duplicates: number;
  errors: number;
  serverTimestamp: string;
}

export interface AnalyticsOverview {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  answeredCalls: number;
  missedCalls: number;
  rejectedCalls: number;
  totalConnectedDurationSeconds: number;
  avgConnectedDurationSeconds: number;
  activeEmployeesCount: number;
  enrolledDevicesCount: number;
}

export interface DailyCallTrend {
  date: string;
  total: number;
  incoming: number;
  outgoing: number;
  answered: number;
  missed: number;
  totalDurationSeconds: number;
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  teamName?: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  outgoingCalls: number;
  incomingCalls: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  lastActiveAt?: string;
}

export interface DeviceSyncHealth {
  deviceId: string;
  deviceName: string;
  employeeName: string;
  model: string;
  lastContactAt?: string;
  lastSyncAt?: string;
  status: DeviceStatus;
  permissionGranted: boolean;
  appVersion: string;
  syncStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NEVER_SYNCED';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

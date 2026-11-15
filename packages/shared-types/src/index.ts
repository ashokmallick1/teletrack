/**
 * Core domain types and API contracts for TeleTrack-like Call Analytics SaaS
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
  username?: string;
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
  organization?: Organization;
  devices?: Device[];
  desktopDevices?: DesktopDevice[];
  desktopActiveSeconds?: number;
  totalCalls?: number;
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

export type CallSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED' | 'INTERESTED';

export interface TranscriptItem {
  speaker: 'TELECALLER' | 'CUSTOMER';
  text: string;
  timestamp: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface CallQualityScore {
  overall: number; // 0 - 100
  greeting: number; // 0 - 100
  productKnowledge: number; // 0 - 100
  objectionHandling: number; // 0 - 100
  closingEffectiveness: number; // 0 - 100
  professionalism: number; // 0 - 100
}

export interface SpeechDiagnostics {
  telecallerTalkPercent: number; // e.g. 45%
  customerTalkPercent: number; // e.g. 55%
  wordsPerMinute: number; // e.g. 138
  interruptionsCount: number;
  longestMonologueSeconds: number;
}

export interface ExtractedLeadData {
  qualification: 'HOT' | 'WARM' | 'COLD';
  estimatedBudget?: string;
  userCount?: number;
  decisionMaker?: string;
  currentProvider?: string;
  timeline?: string;
  keyNeeds?: string[];
}

export interface CallAiAnalysis {
  transcript: TranscriptItem[];
  summary: string;
  sentiment: CallSentiment;
  sentimentScore: number; // 0 - 100
  intent: string;
  disposition: string;
  keyObjections: string[];
  actionItems: string[];
  qualityScore: CallQualityScore;
  speechDiagnostics?: SpeechDiagnostics;
  extractedLeadData?: ExtractedLeadData;
  compliancePassed: boolean;
  languageDetected: string;
  analyzedAt: string;
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
  hasRecording?: boolean;
  recordingUrl?: string;
  recordingDurationSeconds?: number;
  recordingFileSize?: number;
  aiAnalysis?: CallAiAnalysis;
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

export interface DeviceEnrollRegisterRequest {
  mode: 'JOIN_ORG' | 'CREATE_ORG';
  orgCode?: string;
  organizationName?: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  deviceIdentifier: string;
  deviceName: string;
  model: string;
  manufacturer: string;
  osVersion: string;
  appVersion: string;
  permissionGranted: boolean;
  simMetadata?: Record<string, any>;
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

export interface TimeGroupedReportItem {
  periodKey: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  answeredCalls: number;
  missedCalls: number;
  rejectedCalls: number;
  answerRate: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  uniqueNumbersCount: number;
}

export interface UnattendedCallItem {
  phoneNumber: string;
  leadName?: string;
  leadId?: string;
  missedAt: string;
  employeeName: string;
  employeeId: string;
  teamName?: string;
  callDirection: CallDirection;
  callOutcome: CallOutcome;
  totalMissedAttempts: number;
  timeElapsed: string;
}

export interface AdvancedAnalyticsResponse {
  overview: {
    totalCalls: number;
    incomingCalls: number;
    outgoingCalls: number;
    answeredCalls: number;
    missedCalls: number;
    rejectedCalls: number;
    neverAttendedCount: number;
    neverAttendedRate: number;
    totalDurationSeconds: number;
    inboundDurationSeconds: number;
    outboundDurationSeconds: number;
    avgConnectedDurationSeconds: number;
    uniqueClientsCount: number;
  };
  dayWise: TimeGroupedReportItem[];
  weekWise: TimeGroupedReportItem[];
  monthWise: TimeGroupedReportItem[];
  unattendedCalls: UnattendedCallItem[];
  hourlyDistribution: Array<{
    hour: number;
    hourLabel: string;
    total: number;
    answered: number;
    missed: number;
    answerRate: number;
    durationSeconds: number;
  }>;
  durationBuckets: {
    under30s: number;
    between30sAnd2m: number;
    between2mAnd5m: number;
    over5m: number;
  };
  dayOfWeekDistribution: Array<{
    dayIndex: number;
    dayName: string;
    total: number;
    answered: number;
    missed: number;
    answerRate: number;
    durationSeconds: number;
  }>;
}

// Desktop Activity & Unified Productivity Types

export type ActivityCategory = 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL';
export type WorkStatus = 'WORKING' | 'IDLE' | 'ON_BREAK' | 'OFFLINE';

export interface DesktopDevice {
  id: string;
  organizationId: string;
  employeeId: string;
  hostname: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  status: 'ACTIVE' | 'REVOKED';
  lastContactAt?: string;
  lastSyncAt?: string;
  currentStatus?: WorkStatus;
  currentApp?: string;
  currentWindowTitle?: string;
  employee?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DesktopActivitySlot {
  id: string;
  organizationId: string;
  employeeId: string;
  deviceId: string;
  startedAt: string;
  durationSeconds: number;
  processName: string;
  windowTitle: string;
  category: ActivityCategory;
  isIdle: boolean;
  idleSeconds: number;
  createdAt: string;
}

export interface DesktopClockEvent {
  id: string;
  organizationId: string;
  employeeId: string;
  deviceId?: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: string;
  note?: string;
}

export interface IngestDesktopActivityDto {
  startedAt: string;
  durationSeconds: number;
  processName: string;
  windowTitle: string;
  category: ActivityCategory;
  isIdle: boolean;
  idleSeconds: number;
}

export interface IngestDesktopBatchRequest {
  clientTimestamp: string;
  slots: IngestDesktopActivityDto[];
  workStatus: WorkStatus;
  currentApp?: string;
  currentWindowTitle?: string;
}

export interface DesktopEnrollmentResponse {
  deviceApiKey: string;
  deviceId: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  employeeName: string;
  syncIntervalSeconds: number;
}

export interface EmployeeProductivitySummary {
  employeeId: string;
  employeeName: string;
  teamName?: string;
  role: UserRole;
  
  // Mobile SIM metrics
  mobileCallsCount: number;
  mobileTalkTimeSeconds: number;
  mobileAnsweredCalls: number;
  
  // Desktop metrics
  desktopActiveSeconds: number;
  desktopIdleSeconds: number;
  desktopBreakSeconds: number;
  desktopProductiveSeconds: number;
  desktopUnproductiveSeconds: number;
  desktopNeutralSeconds: number;
  desktopTotalWorkSeconds: number;
  
  // Combined Score
  productivityScore: number; // 0 - 100%
  currentStatus: WorkStatus;
  currentApp?: string;
  currentWindowTitle?: string;
  lastActiveAt?: string;
  
  topApplications: Array<{
    name: string;
    durationSeconds: number;
    category: ActivityCategory;
    percentage: number;
  }>;
  
  // Day Timeline slots
  timeline: Array<{
    timeSlot: string; // e.g. "09:00", "09:30"
    mobileTalkSeconds: number;
    desktopActiveSeconds: number;
    desktopIdleSeconds: number;
    category: ActivityCategory | 'CALL' | 'IDLE' | 'INACTIVE';
  }>;
}

export interface ProductivityOverviewResponse {
  totalEmployeesTracked: number;
  activeNowCount: number;
  avgProductivityScore: number;
  totalCompanyTalkTimeSeconds: number;
  totalCompanyDesktopActiveSeconds: number;
  totalCompanyIdleSeconds: number;
  categoryBreakdown: {
    productiveSeconds: number;
    unproductiveSeconds: number;
    neutralSeconds: number;
    idleSeconds: number;
    callSeconds: number;
  };
  employees: EmployeeProductivitySummary[];
}

export interface CreateEmployeeRequest {
  fullName: string;
  username?: string;
  email?: string;
  password?: string;
  role: UserRole;
  teamId?: string;
  employeeCode?: string;
}

export interface EmployeeCredentials {
  username: string;
  email: string;
  password?: string;
  orgSlug: string;
  orgName: string;
  webPortalUrl: string;
  apiUrl: string;
  apkDownloadUrl: string;
  desktopDownloadUrl: string;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type CampaignLeadStatus = 'PENDING' | 'DIALED' | 'CONNECTED' | 'BUSY' | 'SKIPPED';

export interface CampaignLead {
  id: string;
  campaignId: string;
  name: string;
  phoneNumber: string;
  company?: string;
  status: CampaignLeadStatus;
  attempts: number;
  lastDialedAt?: string;
  notes?: string;
}

export interface CallingCampaign {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  assignedEmployeeIds: string[];
  status: CampaignStatus;
  totalLeads: number;
  dialedLeads: number;
  connectedLeads: number;
  leads: CampaignLead[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'FOLLOW_UP' | 'QUOTATION' | 'MISSED_CALL' | 'BROCHURE' | 'FEEDBACK';
  title: string;
  templateText: string;
}

export interface WebhookConfig {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EvolutionInstanceConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'PAIRING';
  pairedNumber?: string;
  profileName?: string;
  qrCodeBase64?: string;
  pairingCode?: string;
  lastConnectedAt?: string;
}

export interface SendEvolutionMessageRequest {
  phoneNumber: string;
  messageText: string;
  templateId?: string;
  variables?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio';
  fileName?: string;
}

export interface EvolutionMessageResponse {
  success: boolean;
  messageId: string;
  phoneNumber: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: string;
  instanceName: string;
  note?: string;
}

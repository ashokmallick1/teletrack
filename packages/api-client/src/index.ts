import {
  UserRole,
  UserProfile,
  Organization,
  OrganizationMembership,
  Team,
  Device,
  CallEvent,
  Lead,
  LeadNote,
  FollowUpTask,
  AuditLog,
  AnalyticsOverview,
  DailyCallTrend,
  EmployeePerformance,
  DeviceSyncHealth,
  PaginatedResult,
  DeviceEnrollmentRequest,
  DeviceEnrollmentResponse,
  IngestBatchRequest,
  IngestBatchResponse,
  AdvancedAnalyticsResponse,
  TimeGroupedReportItem,
  UnattendedCallItem,
  DesktopDevice,
  ProductivityOverviewResponse,
  EmployeeProductivitySummary,
  CreateEmployeeRequest,
  EmployeeCredentials,
  CallAiAnalysis,
  CallingCampaign,
  CampaignLead,
  WhatsAppTemplate,
  WebhookConfig,
  EvolutionInstanceConfig,
  SendEvolutionMessageRequest,
  EvolutionMessageResponse
} from '@teletrack/shared-types';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  getOrganizationId?: () => string | null | Promise<string | null>;
}

export class TeleTrackApiClient {
  private baseUrl: string;
  private getToken?: () => string | null | Promise<string | null>;
  private getOrganizationId?: () => string | null | Promise<string | null>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getToken = options.getToken;
    this.getOrganizationId = options.getOrganizationId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (this.getOrganizationId) {
      const orgId = await this.getOrganizationId();
      if (orgId) {
        headers.set('x-organization-id', orgId);
      }
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }
      throw new Error(errorBody.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth & Org
  async getMe(): Promise<{ user: UserProfile; memberships: OrganizationMembership[] }> {
    try {
      return await this.request('/api/v1/auth/me');
    } catch {
      return await this.request('/api/v1/me');
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request('/api/v1/organizations');
  }

  async createOrganization(data: { name: string; slug?: string }): Promise<Organization> {
    return this.request('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getOrganizationMembers(orgId: string): Promise<OrganizationMembership[]> {
    return this.request(`/api/v1/organizations/${orgId}/members`);
  }

  // Employees & Teams
  async getEmployees(): Promise<OrganizationMembership[]> {
    return this.request('/api/v1/employees');
  }

  async inviteEmployee(data: CreateEmployeeRequest): Promise<OrganizationMembership & { credentials?: EmployeeCredentials }> {
    return this.request('/api/v1/employees/invitations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateEmployee(membershipId: string, data: { role?: UserRole; teamId?: string | null; employeeCode?: string; password?: string; isActive?: boolean }): Promise<OrganizationMembership> {
    return this.request(`/api/v1/employees/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async resetEmployeePassword(membershipId: string, password?: string): Promise<{ success: boolean; password: string; credentials: EmployeeCredentials }> {
    return this.request(`/api/v1/employees/${membershipId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  async getTeams(): Promise<Team[]> {
    return this.request('/api/v1/teams');
  }

  async createTeam(data: { name: string; description?: string }): Promise<Team> {
    return this.request('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return this.request('/api/v1/devices');
  }

  async generateEnrollmentToken(employeeId: string): Promise<{ token: string; qrData: string; expiresAt: string }> {
    return this.request('/api/v1/devices/enrollment-token', {
      method: 'POST',
      body: JSON.stringify({ employeeId })
    });
  }

  async enrollDevice(data: DeviceEnrollmentRequest): Promise<DeviceEnrollmentResponse> {
    return this.request('/api/v1/devices/enroll', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async revokeDevice(deviceId: string): Promise<{ success: boolean }> {
    return this.request(`/api/v1/devices/${deviceId}/revoke`, {
      method: 'POST'
    });
  }

  // Call Events
  async getCallEvents(params?: Record<string, any>): Promise<PaginatedResult<CallEvent>> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/call-events${query ? `?${query}` : ''}`);
  }

  async ingestBatch(data: IngestBatchRequest, deviceApiKey: string): Promise<IngestBatchResponse> {
    return this.request('/api/v1/call-events/batch', {
      method: 'POST',
      headers: {
        'x-device-api-key': deviceApiKey
      },
      body: JSON.stringify(data)
    });
  }

  async getCallAiAnalysis(callId: string): Promise<CallAiAnalysis> {
    return this.request(`/api/v1/call-recordings/${callId}/analysis`);
  }

  async reanalyzeCall(callId: string): Promise<{ success: boolean; aiAnalysis: CallAiAnalysis }> {
    return this.request(`/api/v1/call-recordings/${callId}/reanalyze`, {
      method: 'POST'
    });
  }

  getCallAudioUrl(callId: string): string {
    return `${this.baseUrl}/api/v1/call-recordings/${callId}/audio`;
  }

  async clearDemoCalls(): Promise<{ message: string; deletedCount: number }> {
    return this.request('/api/v1/call-events/clear-demo', {
      method: 'POST'
    });
  }

  async exportCallEventsCsv(params?: Record<string, any>): Promise<string> {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken ? await this.getToken() : null;
    const orgId = this.getOrganizationId ? await this.getOrganizationId() : null;
    const url = `${this.baseUrl}/api/v1/call-events/export${query ? `?${query}` : ''}`;
    
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'x-organization-id': orgId } : {})
      }
    });
    if (!res.ok) throw new Error('Failed to export CSV');
    return res.text();
  }

  // Analytics
  async getAnalyticsOverview(params?: { startDate?: string; endDate?: string }): Promise<AnalyticsOverview> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/analytics/overview${query ? `?${query}` : ''}`);
  }

  async getDailyTrends(params?: { startDate?: string; endDate?: string }): Promise<DailyCallTrend[]> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/analytics/calls${query ? `?${query}` : ''}`);
  }

  async getEmployeePerformance(params?: { startDate?: string; endDate?: string }): Promise<EmployeePerformance[]> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/analytics/employees${query ? `?${query}` : ''}`);
  }

  async getSyncHealth(): Promise<DeviceSyncHealth[]> {
    return this.request('/api/v1/analytics/sync-health');
  }

  async getAdvancedAnalytics(params?: { startDate?: string; endDate?: string; employeeId?: string; teamId?: string }): Promise<AdvancedAnalyticsResponse> {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) cleanParams[k] = v;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/api/v1/analytics/reports${query ? `?${query}` : ''}`);
  }

  // Leads
  async getLeads(params?: Record<string, any>): Promise<PaginatedResult<Lead>> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/leads${query ? `?${query}` : ''}`);
  }

  async createLead(data: Partial<Lead>): Promise<Lead> {
    return this.request('/api/v1/leads', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLead(leadId: string, data: Partial<Lead>): Promise<Lead> {
    return this.request(`/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async addLeadNote(leadId: string, note: string): Promise<LeadNote> {
    return this.request(`/api/v1/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  async getFollowUps(): Promise<FollowUpTask[]> {
    return this.request('/api/v1/follow-ups');
  }

  async importLeadsCsv(formData: FormData): Promise<{ inserted: number; errors: number }> {
    const token = this.getToken ? await this.getToken() : null;
    const orgId = this.getOrganizationId ? await this.getOrganizationId() : null;
    const res = await fetch(`${this.baseUrl}/api/v1/leads/import`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'x-organization-id': orgId } : {})
      },
      body: formData
    });
    if (!res.ok) throw new Error('Failed to import leads');
    return res.json();
  }

  // Settings & Admin
  async updateOrganizationSettings(orgId: string, data: Partial<Organization>): Promise<Organization> {
    return this.request(`/api/v1/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async getAuditLogs(params?: Record<string, any>): Promise<PaginatedResult<AuditLog>> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/audit-logs${query ? `?${query}` : ''}`);
  }

  async getAdminOrganizations(): Promise<any[]> {
    return this.request('/api/v1/admin/organizations');
  }

  async getAdminUsage(): Promise<any> {
    return this.request('/api/v1/admin/usage');
  }

  // Desktop & Productivity
  async getDesktopDevices(): Promise<DesktopDevice[]> {
    return this.request('/api/v1/desktop/devices');
  }

  async getProductivityOverview(params?: { startDate?: string; endDate?: string; teamId?: string }): Promise<ProductivityOverviewResponse> {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) cleanParams[k] = v;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/api/v1/productivity/overview${query ? `?${query}` : ''}`);
  }

  async getEmployeeProductivity(employeeId: string, params?: { startDate?: string; endDate?: string }): Promise<EmployeeProductivitySummary> {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) cleanParams[k] = v;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/api/v1/productivity/employee/${employeeId}${query ? `?${query}` : ''}`);
  }

  // Campaigns & Power Dialer
  async getCampaigns(): Promise<{ success: boolean; count: number; data: CallingCampaign[] }> {
    return this.request('/api/v1/campaigns');
  }

  async getCampaignById(id: string): Promise<{ success: boolean; data: CallingCampaign }> {
    return this.request(`/api/v1/campaigns/${id}`);
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    assignedEmployeeIds?: string[];
    leads: Array<{ name: string; phoneNumber: string; company?: string }>;
  }): Promise<{ success: boolean; data: CallingCampaign }> {
    return this.request('/api/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCampaign(id: string, data: Partial<CallingCampaign>): Promise<{ success: boolean; data: CallingCampaign }> {
    return this.request(`/api/v1/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async updateCampaignLead(
    campaignId: string,
    leadId: string,
    data: Partial<CampaignLead>
  ): Promise<{ success: boolean; data: CampaignLead; campaignStats: any }> {
    return this.request(`/api/v1/campaigns/${campaignId}/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async dialCampaignLead(
    campaignId: string,
    leadId: string
  ): Promise<{ success: boolean; dialedLead: CampaignLead; nextLead: CampaignLead | null; campaignProgress: any }> {
    return this.request(`/api/v1/campaigns/${campaignId}/leads/${leadId}/dial`, {
      method: 'POST'
    });
  }

  // WhatsApp
  async getWhatsAppTemplates(): Promise<{ success: boolean; count: number; data: WhatsAppTemplate[] }> {
    return this.request('/api/v1/whatsapp/templates');
  }

  async generateWhatsAppLink(data: {
    phoneNumber: string;
    templateId?: string;
    customMessage?: string;
    variables?: Record<string, string>;
  }): Promise<{ success: boolean; phoneNumber: string; messageText: string; whatsappUrl: string }> {
    return this.request('/api/v1/whatsapp/generate-link', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Webhooks
  async getWebhooks(): Promise<{ success: boolean; count: number; data: WebhookConfig[] }> {
    return this.request('/api/v1/webhooks');
  }

  async createWebhook(data: {
    url: string;
    events?: string[];
    secret?: string;
  }): Promise<{ success: boolean; data: WebhookConfig }> {
    return this.request('/api/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteWebhook(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/v1/webhooks/${id}`, {
      method: 'DELETE'
    });
  }

  async testWebhook(data: { url: string; eventType?: string }): Promise<any> {
    return this.request('/api/v1/webhooks/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Evolution API WhatsApp Integration
  async getEvolutionStatus(instanceName?: string): Promise<{ success: boolean; data: EvolutionInstanceConfig }> {
    const query = instanceName ? `?instanceName=${encodeURIComponent(instanceName)}` : '';
    return this.request(`/api/v1/whatsapp/evolution/status${query}`);
  }

  async connectEvolution(instanceName?: string): Promise<{ success: boolean; data: EvolutionInstanceConfig }> {
    return this.request('/api/v1/whatsapp/evolution/connect', {
      method: 'POST',
      body: JSON.stringify({ instanceName })
    });
  }

  async disconnectEvolution(instanceName?: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/v1/whatsapp/evolution/disconnect', {
      method: 'POST',
      body: JSON.stringify({ instanceName })
    });
  }

  async updateEvolutionConfig(config: { apiUrl?: string; apiKey?: string; instanceName?: string }): Promise<{ success: boolean; data: EvolutionInstanceConfig }> {
    return this.request('/api/v1/whatsapp/evolution/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async sendEvolutionMessage(data: SendEvolutionMessageRequest & { instanceName?: string }): Promise<{ success: boolean; data: EvolutionMessageResponse }> {
    return this.request('/api/v1/whatsapp/evolution/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export * from '@teletrack/shared-types';

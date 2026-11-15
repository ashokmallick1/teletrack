import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { DesktopEnrollmentResponse, IngestDesktopActivityDto, WorkStatus } from '@teletrack/shared-types';

export interface DesktopConfig {
  apiUrl: string;
  deviceApiKey?: string;
  deviceId?: string;
  organizationId?: string;
  organizationName?: string;
  employeeId?: string;
  employeeName?: string;
}

export class DesktopApiClient {
  private configPath: string;
  public config: DesktopConfig;

  constructor() {
    const userData = app?.getPath ? app.getPath('userData') : process.cwd();
    this.configPath = path.join(userData, 'teletrack-desktop-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): DesktopConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }
    } catch {}
    return {
      apiUrl: 'https://teletrack-api.bhashaai.in'
    };
  }

  public saveConfig(newConfig: Partial<DesktopConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DesktopApiClient] Failed to save config:', e);
    }
  }

  public clearConfig() {
    this.config = { apiUrl: this.config.apiUrl || 'https://teletrack-api.bhashaai.in' };
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
    } catch {}
  }

  public isEnrolled(): boolean {
    return !!(this.config.deviceApiKey && this.config.deviceId);
  }

  public async enroll(email: string, password: string, orgCode?: string): Promise<DesktopEnrollmentResponse> {
    const hostname = os.hostname() || 'Windows-PC';
    const osVersion = `${os.type()} ${os.release()}`;

    const res = await fetch(`${this.config.apiUrl}/api/v1/desktop/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        orgCode: orgCode?.trim() || undefined,
        hostname,
        osName: 'Windows',
        osVersion,
        appVersion: '1.0.0'
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Enrollment failed');
    }

    const data: DesktopEnrollmentResponse = await res.json();
    this.saveConfig({
      deviceApiKey: data.deviceApiKey,
      deviceId: data.deviceId,
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      employeeId: data.employeeId,
      employeeName: data.employeeName
    });

    return data;
  }

  public async uploadActivity(
    slots: IngestDesktopActivityDto[],
    workStatus: WorkStatus,
    currentApp?: string,
    currentWindowTitle?: string
  ): Promise<boolean> {
    if (!this.isEnrolled()) return false;

    try {
      const res = await fetch(`${this.config.apiUrl}/api/v1/desktop/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-desktop-api-key': this.config.deviceApiKey!
        },
        body: JSON.stringify({
          clientTimestamp: new Date().toISOString(),
          slots,
          workStatus,
          currentApp,
          currentWindowTitle
        })
      });

      return res.ok;
    } catch (err) {
      console.warn('[DesktopApiClient] Failed to upload activity batch:', err);
      return false;
    }
  }

  public async recordClock(type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END', note?: string): Promise<boolean> {
    if (!this.isEnrolled()) return false;

    try {
      const res = await fetch(`${this.config.apiUrl}/api/v1/desktop/clock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-desktop-api-key': this.config.deviceApiKey!
        },
        body: JSON.stringify({ type, note })
      });
      return res.ok;
    } catch (err) {
      console.warn('[DesktopApiClient] Failed to record clock event:', err);
      return false;
    }
  }
}

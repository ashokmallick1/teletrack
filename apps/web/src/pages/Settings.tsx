import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Eye,
  Database,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AuditLog } from '@callyzer/shared-types';

export const Settings: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'subscription' | 'audit'>('general');

  // Form states
  const [name, setName] = useState(activeOrg?.name || '');
  const [timezone, setTimezone] = useState(activeOrg?.timezone || 'UTC');
  const [retentionDays, setRetentionDays] = useState(activeOrg?.retentionDays || 90);
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(activeOrg?.maskPhoneNumbers || false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
      setTimezone(activeOrg.timezone);
      setRetentionDays(activeOrg.retentionDays);
      setMaskPhoneNumbers(activeOrg.maskPhoneNumbers);
    }
  }, [activeOrg]);

  const loadAuditLogs = async () => {
    try {
      const res = await client.getAuditLogs();
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      await client.updateOrganizationSettings(activeOrg.id, {
        name,
        timezone,
        retentionDays: Number(retentionDays),
        maskPhoneNumbers
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure security, customer privacy masking, retention and review audit trails
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General Profile
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'privacy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Privacy & Masking
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'subscription' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Subscription & Limits
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Organization settings saved successfully!</span>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Company / Organization Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Organization Slug</label>
            <input
              type="text"
              disabled
              value={activeOrg?.slug || ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Company Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
              <option value="America/New_York">America/New_York (EST -05:00)</option>
              <option value="Europe/London">Europe/London (GMT +00:00)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
              <option value="UTC">UTC (Universal Coordinated Time)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Privacy & Phone Number Masking */}
      {activeTab === 'privacy' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 max-w-2xl">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-900 text-sm">Customer Phone Number Masking</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                When enabled, phone numbers are masked in employee views (e.g. <code>+9198****1223</code>) to protect customer data privacy. Only organization owners and administrators can view raw numbers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={maskPhoneNumbers}
                onChange={e => setMaskPhoneNumbers(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Call Telematics Retention Policy (Days)</label>
            <input
              type="number"
              min={7}
              max={365}
              value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Call events older than this limit are archived and pruned automatically.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Privacy Policy'}
            </button>
          </div>
        </form>
      )}

      {/* Subscription & Limits */}
      {activeTab === 'subscription' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 max-w-2xl">
          <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-xl border border-blue-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Current Subscription</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">Professional Plan</h3>
              <p className="text-xs text-slate-600 mt-1">Full analytics, lead CRM, and background sync</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase">Enrolled Handsets</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">2 / {activeOrg?.maxDevices || 25}</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '8%' }}></div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase">Retention Period</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{activeOrg?.retentionDays || 90} Days</p>
              <p className="text-xs text-slate-400 mt-2">Included in Pro plan</p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {auditLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition text-xs">
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-900">
                      {l.actorName || l.actorEmail || l.actorId}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-blue-600 font-semibold">
                      {l.action}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                      {l.resourceType}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      {JSON.stringify(l.details || {})}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      No audit events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

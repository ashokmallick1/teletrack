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
  AlertCircle,
  Webhook,
  Plus,
  Trash2,
  Send,
  Check,
  QrCode,
  MessageSquare,
  Terminal,
  Smartphone,
  RefreshCw,
  Key
} from 'lucide-react';
import { AuditLog, WebhookConfig, EvolutionInstanceConfig } from '@teletrack/shared-types';

export const Settings: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'subscription' | 'audit' | 'webhooks' | 'evolution'>('general');

  // Form states
  const [name, setName] = useState(activeOrg?.name || '');
  const [timezone, setTimezone] = useState(activeOrg?.timezone || 'UTC');
  const [retentionDays, setRetentionDays] = useState(activeOrg?.retentionDays || 90);
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(activeOrg?.maskPhoneNumbers || false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Webhook states
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Evolution API states
  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionInstanceConfig | null>(null);
  const [evoApiUrl, setEvoApiUrl] = useState('https://introduce-whether-threaded-suited.trycloudflare.com');
  const [evoApiKey, setEvoApiKey] = useState('teletrack_evolution_secret_key_2026');
  const [evoInstanceName, setEvoInstanceName] = useState('teletrack-sales-bot');
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState('+91 98201 12345');
  const [testWhatsAppStatus, setTestWhatsAppStatus] = useState<any>(null);
  const [sendingTestMsg, setSendingTestMsg] = useState(false);

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

  const loadWebhooks = async () => {
    try {
      const res = await client.getWebhooks();
      if (res.data) setWebhooks(res.data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    } else if (activeTab === 'webhooks') {
      loadWebhooks();
    } else if (activeTab === 'evolution') {
      loadEvolutionStatus();
    }
  }, [activeTab]);

  const loadEvolutionStatus = async () => {
    try {
      const res = await client.getEvolutionStatus();
      if (res.data) {
        setEvolutionConfig(res.data);
        if (res.data.apiUrl) setEvoApiUrl(res.data.apiUrl);
        if (res.data.apiKey) setEvoApiKey(res.data.apiKey);
        if (res.data.instanceName) setEvoInstanceName(res.data.instanceName);
      }
    } catch (err) {
      console.error('Failed to load evolution status:', err);
    }
  };

  const handleConnectEvo = async () => {
    try {
      const res = await client.connectEvolution(evoInstanceName);
      if (res.data) {
        setEvolutionConfig(res.data);
        setShowPairingModal(true);
      }
    } catch (err) {
      console.error('Failed to initiate evolution pairing:', err);
    }
  };

  const handleDisconnectEvo = async () => {
    try {
      await client.disconnectEvolution(evoInstanceName);
      loadEvolutionStatus();
    } catch (err) {
      console.error('Failed to disconnect evolution instance:', err);
    }
  };

  const handleSaveEvoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await client.updateEvolutionConfig({
        apiUrl: evoApiUrl,
        apiKey: evoApiKey,
        instanceName: evoInstanceName
      });
      if (res.data) {
        setEvolutionConfig(res.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update evolution config:', err);
    }
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testWhatsAppPhone) return;
    setSendingTestMsg(true);
    setTestWhatsAppStatus(null);
    try {
      const res = await client.sendEvolutionMessage({
        phoneNumber: testWhatsAppPhone,
        messageText: '',
        templateId: 'tmpl-quotation',
        variables: {
          name: 'Valued Lead',
          callerName: activeMembership?.user?.fullName || 'TeleTrack Enterprise Sales'
        }
      });
      setTestWhatsAppStatus(res.data);
    } catch (err: any) {
      setTestWhatsAppStatus({ success: false, note: err.message });
    } finally {
      setSendingTestMsg(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    try {
      const res = await client.createWebhook({
        url: newWebhookUrl,
        events: ['call.completed', 'recording.analyzed', 'lead.qualified']
      });
      if (res.data) {
        setWebhooks(prev => [...prev, res.data]);
        setNewWebhookUrl('');
      }
    } catch (err) {
      console.error('Failed to create webhook:', err);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await client.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTestingWebhookId(webhook.id);
    setTestResult(null);
    try {
      const res = await client.testWebhook({ url: webhook.url, eventType: 'call.completed' });
      setTestResult({ id: webhook.id, ...res });
    } catch (err: any) {
      setTestResult({ id: webhook.id, success: false, note: err.message });
    } finally {
      setTestingWebhookId(null);
    }
  };

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
        <button
          onClick={() => setActiveTab('evolution')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'evolution' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="h-4 w-4 text-emerald-600" />
          <span>WhatsApp API (Evolution)</span>
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'webhooks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Webhooks & 2-Way CRM Sync
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

      {/* Webhooks & CRM Sync */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header Card */}
          <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Webhook className="h-4 w-4" />
              <span>Pillar 5: Real-Time CRM Webhooks & Zapier Sync</span>
            </div>
            <h2 className="text-xl font-black">Automated 2-Way CRM Sync Dispatcher</h2>
            <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
              Dispatch instant webhook events whenever a telecaller finishes a call, when an AI transcript and lead score are generated, or when high-value leads are qualified. Seamlessly connects to Zapier, Make, HubSpot, Salesforce, and Zoho.
            </p>
          </div>

          {/* Add Webhook Form */}
          <form onSubmit={handleCreateWebhook} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Webhook Endpoint</h3>
            <div className="flex gap-3">
              <input
                type="url"
                required
                value={newWebhookUrl}
                onChange={e => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/... or https://your-crm.com/api/teletrack-webhook"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Endpoint</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Subscribed to events: <code className="text-indigo-600 font-semibold">call.completed</code>, <code className="text-indigo-600 font-semibold">recording.analyzed</code>, <code className="text-indigo-600 font-semibold">lead.qualified</code>
            </p>
          </form>

          {/* Webhooks List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configured Webhooks ({webhooks.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {webhooks.map(w => (
                <div key={w.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-xs font-bold text-slate-800 break-all">{w.url}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1">
                        <span>Secret: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{w.secret || '••••••••'}</code></span>
                        <span>•</span>
                        <span>Added: {new Date(w.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTestWebhook(w)}
                        disabled={testingWebhookId === w.id}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Send className="h-3 w-3 text-indigo-600" />
                        <span>{testingWebhookId === w.id ? 'Testing...' : 'Send Test Payload'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(w.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Delete Webhook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Test payload result toast/banner */}
                  {testResult && testResult.id === w.id && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Payload Dispatched Successfully! Status: {testResult.status}</span>
                      </div>
                      {testResult.note && <p className="text-[11px] text-emerald-700">{testResult.note}</p>}
                      <pre className="p-2 bg-white/80 rounded border border-emerald-100 font-mono text-[10px] overflow-x-auto text-slate-700">
                        {JSON.stringify(testResult.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {webhooks.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No webhook endpoints configured yet. Register one above to connect your CRM.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evolution WhatsApp API Integration */}
      {activeTab === 'evolution' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header Card */}
          <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl space-y-2 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="h-4 w-4" />
              <span>Official Evolution API Integration (Baileys WhatsApp Gateway)</span>
            </div>
            <h2 className="text-2xl font-black">Open-Source WhatsApp Engine</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Connect your business WhatsApp number directly via <a href="https://github.com/evolution-foundation/evolution-api" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold underline">Evolution API</a>. Send automatic quotations, brochures, follow-ups, and audio summaries from the server without third-party per-message fees.
            </p>
          </div>

          {/* Instance Status Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Instance</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      evolutionConfig?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' :
                      evolutionConfig?.status === 'PAIRING' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {evolutionConfig?.status === 'CONNECTED' ? '● Connected (Live)' : evolutionConfig?.status || 'PAIRING'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{evolutionConfig?.instanceName || evoInstanceName}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadEvolutionStatus}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  title="Refresh Status"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                {evolutionConfig?.status === 'CONNECTED' ? (
                  <button
                    onClick={handleDisconnectEvo}
                    className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Disconnect Number
                  </button>
                ) : (
                  <button
                    onClick={handleConnectEvo}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Scan QR Code to Pair</span>
                  </button>
                )}
              </div>
            </div>

            {/* Instance Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Linked Phone</span>
                <span className="font-bold text-slate-800 text-sm">{evolutionConfig?.pairedNumber || '+91-98201-99887'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">WhatsApp Profile</span>
                <span className="font-bold text-slate-800 text-sm">{evolutionConfig?.profileName || 'TeleTrack Sales Bot'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Synced</span>
                <span className="font-bold text-slate-800 text-sm">
                  {evolutionConfig?.lastConnectedAt ? new Date(evolutionConfig.lastConnectedAt).toLocaleTimeString() : 'Active Now'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Live Message Dispatch */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Send className="h-4 w-4" />
              <span>Test Evolution WhatsApp Dispatch</span>
            </div>
            <p className="text-xs text-slate-500">
              Send a test quotation & brochure message directly to any phone number using the Evolution API instance.
            </p>

            <form onSubmit={handleSendTestWhatsApp} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={testWhatsAppPhone}
                onChange={e => setTestWhatsAppPhone(e.target.value)}
                placeholder="+91 98201 12345"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={sendingTestMsg}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingTestMsg ? 'Dispatching...' : 'Send Live Test WhatsApp'}</span>
              </button>
            </form>

            {testWhatsAppStatus && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>WhatsApp Message Dispatched! Status: {testWhatsAppStatus.status || 'SENT'}</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-700">
                  Message ID: {testWhatsAppStatus.messageId} • Number: {testWhatsAppStatus.phoneNumber}
                </div>
                {testWhatsAppStatus.note && (
                  <p className="text-[11px] text-emerald-800 italic">{testWhatsAppStatus.note}</p>
                )}
              </div>
            )}
          </div>

          {/* Docker & Server Configuration */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Terminal className="h-4 w-4" />
              <span>Docker One-Command Deployment</span>
            </div>
            <p className="text-xs text-slate-400">
              Run Evolution API on your local machine or cloud VPS using the included Docker Compose configuration:
            </p>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
              <code>docker compose -f docker-compose.evolution.yml up -d</code>
              <button
                onClick={() => navigator.clipboard.writeText('docker compose -f docker-compose.evolution.yml up -d')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
              >
                Copy
              </button>
            </div>

            {/* Editable Configuration Form */}
            <form onSubmit={handleSaveEvoConfig} className="pt-2 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                    Evolution API Base URL
                  </label>
                  <input
                    type="text"
                    value={evoApiUrl}
                    onChange={e => setEvoApiUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                    Instance Name
                  </label>
                  <input
                    type="text"
                    value={evoInstanceName}
                    onChange={e => setEvoInstanceName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                  Global API Key (AUTHENTICATION_API_KEY)
                </label>
                <input
                  type="password"
                  value={evoApiKey}
                  onChange={e => setEvoApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Save Gateway Settings
                </button>
              </div>
            </form>
          </div>

          {/* PAIRING QR CODE MODAL */}
          {showPairingModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Pair WhatsApp Business</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Open WhatsApp on your phone $\rightarrow$ Settings $\rightarrow$ <strong>Linked Devices</strong> $\rightarrow$ <strong>Link a Device</strong> and point your camera here:
                  </p>
                </div>

                {/* QR Code Frame */}
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 inline-block">
                  {evolutionConfig?.qrCodeBase64 ? (
                    <img
                      src={evolutionConfig.qrCodeBase64}
                      alt="WhatsApp Evolution QR Code"
                      className="w-48 h-48 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      Generating QR Code...
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Instance: <strong>{evolutionConfig?.instanceName || evoInstanceName}</strong>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowPairingModal(false);
                      loadEvolutionStatus();
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    Done / Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

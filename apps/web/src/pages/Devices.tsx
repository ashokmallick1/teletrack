import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { Device, OrganizationMembership } from '@teletrack/shared-types';
import { SyncStatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const Devices: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [employees, setEmployees] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // Enrollment Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [enrollmentResult, setEnrollmentResult] = useState<{ token: string; qrData: string; expiresAt: string } | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Revoke Dialog
  const [revokeDeviceId, setRevokeDeviceId] = useState<string | null>(null);

  const canManage = activeMembership?.role === 'ORG_OWNER' || activeMembership?.role === 'ORG_ADMIN';

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [devs, emps] = await Promise.all([
        client.getDevices(),
        client.getEmployees()
      ]);
      setDevices(devs);
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg]);

  const handleGenerateToken = async () => {
    if (!selectedEmployeeId) return;
    setEnrollLoading(true);
    try {
      const res = await client.generateEnrollmentToken(selectedEmployeeId);
      setEnrollmentResult(res);
    } catch (err) {
      console.error('Failed to generate token:', err);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleRevokeDevice = async () => {
    if (!revokeDeviceId) return;
    try {
      await client.revokeDevice(revokeDeviceId);
      setRevokeDeviceId(null);
      loadData();
    } catch (err) {
      console.error('Failed to revoke device:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSyncState = (lastSyncAt?: string): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NEVER_SYNCED' => {
    if (!lastSyncAt) return 'NEVER_SYNCED';
    const diff = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
    if (diff > 1440) return 'CRITICAL';
    if (diff > 60) return 'WARNING';
    return 'HEALTHY';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enrolled Android Handsets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor device agent versions, telemetry synchronization and permission health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/teletrack.apk?v=3"
            download="teletrack.apk"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            <span>Download Agent APK</span>
          </a>
          {canManage && (
            <button
              onClick={() => {
                setEnrollmentResult(null);
                setIsEnrollModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
            >
              <QrCode className="h-4 w-4" />
              <span>Enroll Handset</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Devices Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Device</th>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Platform</th>
                <th className="px-6 py-3.5">Permission Health</th>
                <th className="px-6 py-3.5">Last Sync</th>
                <th className="px-6 py-3.5">Sync Health</th>
                {canManage && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {devices.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{d.deviceName}</p>
                        <p className="text-xs font-mono text-slate-400">{d.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                    {d.employee?.fullName || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    <p className="font-medium text-slate-700">{d.osVersion}</p>
                    <p className="text-slate-400">Agent v{d.appVersion}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {d.permissionGranted ? (
                      <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        READ_CALL_LOG Granted
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                        Restricted / Fallback Mode
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SyncStatusBadge status={getSyncState(d.lastSyncAt)} />
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      {d.status === 'REVOKED' ? (
                        <span className="text-rose-500 font-semibold">Revoked</span>
                      ) : (
                        <button
                          onClick={() => setRevokeDeviceId(d.id)}
                          className="text-rose-600 hover:text-rose-800 font-medium transition"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {devices.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    No Android handsets enrolled yet. Click "Enroll Handset" to link an employee device.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll Android Handset"
        description="Generate secure single-use enrollment credentials for employee native dialer telemetry."
      >
        <div className="space-y-4">
          {!enrollmentResult ? (
            <div className="space-y-4">
              {activeOrg?.slug && (
                <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                      Option A: Employee Self-Registration Code
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Employee opens Android App → <strong>Register</strong> → enters Join Code:
                    </p>
                    <p className="font-mono text-sm font-extrabold text-indigo-700 mt-1">
                      {activeOrg.slug}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeOrg.slug)}
                    className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                  >
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Option B: Assign Single-Use Token to Existing Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.user?.fullName} ({e.user?.email}) - {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                ℹ️ The employee keeps making normal SIM calls via their phone dialer. The agent collects authorized call records and sends them in background batches.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateToken}
                  disabled={enrollLoading || !selectedEmployeeId}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {enrollLoading ? 'Generating...' : 'Generate Enrollment Token'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs uppercase font-bold text-slate-400 mb-2">Enrollment Token</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-bold tracking-wider text-blue-600 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                    {enrollmentResult.token}
                  </span>
                  <button
                    onClick={() => copyToClipboard(enrollmentResult.token)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-600"
                    title="Copy token"
                  >
                    {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Valid for 48 hours</p>
              </div>

              <div className="text-left text-xs text-slate-600 space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-800">Instructions for Employee:</p>
                <p>1. Open the <strong>TeleTrack Agent</strong> Android application.</p>
                <p>2. Enter this single-use Enrollment Token.</p>
                <p>3. Grant required call telematics permissions.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsEnrollModalOpen(false);
                    loadData();
                  }}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Revoke Confirmation Dialog */}
      <Modal
        isOpen={!!revokeDeviceId}
        onClose={() => setRevokeDeviceId(null)}
        title="Revoke Device Credentials"
        description="Are you sure you want to revoke this device? It will be immediately unlinked and blocked from uploading further telemetry."
      >
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => setRevokeDeviceId(null)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleRevokeDevice}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
          >
            Revoke Access
          </button>
        </div>
      </Modal>
    </div>
  );
};

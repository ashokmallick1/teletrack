import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Monitor,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  Download,
  RefreshCw,
  TrendingUp,
  Laptop,
  Users,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  ProductivityOverviewResponse,
  DesktopDevice,
  EmployeeProductivitySummary,
  ActivityCategory
} from '@teletrack/shared-types';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';

export const Productivity: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [data, setData] = useState<ProductivityOverviewResponse | null>(null);
  const [desktopDevices, setDesktopDevices] = useState<DesktopDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'devices' | 'apps'>('matrix');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProductivitySummary | null>(null);

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [overview, devs] = await Promise.all([
        client.getProductivityOverview(),
        client.getDesktopDevices()
      ]);
      setData(overview);
      setDesktopDevices(devs);
      if (overview.employees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(overview.employees[0]);
      }
    } catch (err) {
      console.error('Failed to load productivity data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh live heartbeat every 20 seconds
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [activeOrg]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 55) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (score >= 35) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return { label: 'WORKING', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      case 'ON_BREAK':
        return { label: 'ON BREAK', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
      case 'IDLE':
        return { label: 'IDLE (AWAY)', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      default:
        return { label: 'OFFLINE', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const getCategoryColor = (cat: ActivityCategory) => {
    if (cat === 'PRODUCTIVE') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (cat === 'UNPRODUCTIVE') return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Unified Workforce Telematics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Productivity & Desktop Activity
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time correlation of Mobile SIM calls, desktop window activity, active work hours, and productivity scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/teletrack.apk"
            download="teletrack.apk"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Mobile APK</span>
          </a>
          <a
            href="/teletrack-desktop.zip"
            download="teletrack-desktop.zip"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm transition"
          >
            <Laptop className="h-4 w-4" />
            <span>Download Windows Agent (.zip)</span>
          </a>
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition"
            title="Refresh productivity metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <StatCard
          title="Tracked Employees"
          value={data?.totalEmployeesTracked ?? 0}
          icon={Users}
          variant="blue"
        />
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Live Active Now</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900">{data?.activeNowCount ?? 0}</span>
            <span className="text-xs text-emerald-600 font-medium ml-1.5">on desktop / call</span>
          </div>
        </div>
        <StatCard
          title="Team Productivity"
          value={`${data?.avgProductivityScore ?? 0}%`}
          icon={TrendingUp}
          variant="purple"
        />
        <StatCard
          title="Mobile Talk Time"
          value={formatDuration(data?.totalCompanyTalkTimeSeconds ?? 0)}
          icon={PhoneCall}
          variant="amber"
        />
        <StatCard
          title="Desktop Active Hours"
          value={formatDuration(data?.totalCompanyDesktopActiveSeconds ?? 0)}
          icon={Monitor}
          variant="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'matrix'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Unified Employee Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'devices'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Laptop className="h-4 w-4" />
          <span>Enrolled Windows PCs ({desktopDevices.length})</span>
        </button>
      </div>

      {/* TAB 1: Unified Telecaller Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Combined Mobile + Desktop Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Telecallers ranked by overall work output, mobile dialer connected time and active computer engagement
                </p>
              </div>
              <span className="text-xs text-slate-400">Total {data?.employees.length ?? 0} employees</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Telecaller</th>
                    <th className="px-6 py-3.5">Live Desktop Status</th>
                    <th className="px-6 py-3.5 text-center">Mobile Talk Time</th>
                    <th className="px-6 py-3.5 text-center">Desktop Active Time</th>
                    <th className="px-6 py-3.5 text-center">Productivity Score</th>
                    <th className="px-6 py-3.5">Top Desktop Apps</th>
                    <th className="px-6 py-3.5 text-right">Day Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {data?.employees.map(emp => {
                    const st = getStatusBadge(emp.currentStatus);
                    return (
                      <tr
                        key={emp.employeeId}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition ${
                          selectedEmployee?.employeeId === emp.employeeId ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
                              {emp.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.employeeName}</p>
                              <p className="text-xs text-slate-400">{emp.teamName || 'General Team'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.bg}`}>
                              <span className={`h-2 w-2 rounded-full ${st.dot}`}></span>
                              {st.label}
                            </span>
                            {emp.currentApp && emp.currentStatus !== 'OFFLINE' && (
                              <p className="text-[11px] font-mono text-slate-500 truncate max-w-[200px] mt-1">
                                {emp.currentApp} {emp.currentWindowTitle ? `— ${emp.currentWindowTitle}` : ''}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatDuration(emp.mobileTalkTimeSeconds)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {emp.mobileCallsCount} SIM calls
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatDuration(emp.desktopActiveSeconds)}
                            </span>
                            <span className="text-[10px] text-amber-600">
                              {formatDuration(emp.desktopIdleSeconds)} idle
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`px-2.5 py-1 rounded-xl font-extrabold text-xs border ${getScoreBadge(emp.productivityScore)}`}>
                              {emp.productivityScore}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${emp.productivityScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {emp.topApplications.slice(0, 3).map(app => (
                              <span
                                key={app.name}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCategoryColor(app.category)}`}
                              >
                                {app.name} ({app.percentage}%)
                              </span>
                            ))}
                            {emp.topApplications.length === 0 && (
                              <span className="text-xs text-slate-400 italic">No apps tracked</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1">
                            {emp.timeline.map((t, idx) => {
                              let barBg = 'bg-slate-100';
                              if (t.mobileTalkSeconds > 0) barBg = 'bg-amber-400';
                              else if (t.desktopActiveSeconds > 0) barBg = 'bg-blue-500';
                              else if (t.desktopIdleSeconds > 0) barBg = 'bg-slate-300';
                              return (
                                <div
                                  key={idx}
                                  title={`${t.timeSlot}: ${t.mobileTalkSeconds > 0 ? `${formatDuration(t.mobileTalkSeconds)} call` : `${formatDuration(t.desktopActiveSeconds)} desktop`}`}
                                  className={`w-2.5 h-6 rounded-sm ${barBg}`}
                                ></div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Telecaller Deep Dive View */}
          {selectedEmployee && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Productivity Profile: {selectedEmployee.employeeName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detailed breakdown of phone calls, desktop applications, active window titles, and focus times
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getScoreBadge(selectedEmployee.productivityScore)}`}>
                    Score: {selectedEmployee.productivityScore}%
                  </span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getStatusBadge(selectedEmployee.currentStatus).bg}`}>
                    {getStatusBadge(selectedEmployee.currentStatus).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                {/* Mobile Calling Column */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                    <PhoneCall className="h-4 w-4" />
                    <span>Mobile Dialer Output</span>
                  </div>
                  <div className="space-y-2 pt-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Total SIM Calls:</span>
                      <span className="font-bold text-slate-800">{selectedEmployee.mobileCallsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Connected Talk Time:</span>
                      <span className="font-bold text-slate-800">{formatDuration(selectedEmployee.mobileTalkTimeSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Answered Calls:</span>
                      <span className="font-bold text-slate-800">{selectedEmployee.mobileAnsweredCalls}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Activity Column */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                    <Monitor className="h-4 w-4" />
                    <span>Desktop Work Hours</span>
                  </div>
                  <div className="space-y-2 pt-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Active Work Time:</span>
                      <span className="font-bold text-slate-800">{formatDuration(selectedEmployee.desktopActiveSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Idle / Away Time:</span>
                      <span className="font-bold text-amber-600">{formatDuration(selectedEmployee.desktopIdleSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Productive Category:</span>
                      <span className="font-bold text-emerald-600">{formatDuration(selectedEmployee.desktopProductiveSeconds)}</span>
                    </div>
                  </div>
                </div>

                {/* Top Desktop Applications */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                    <Laptop className="h-4 w-4" />
                    <span>Top Applications</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {selectedEmployee.topApplications.map(app => (
                      <div key={app.name} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-slate-800">{app.name}</span>
                        <span className={`px-2 py-0.5 rounded font-bold border ${getCategoryColor(app.category)}`}>
                          {formatDuration(app.durationSeconds)} ({app.percentage}%)
                        </span>
                      </div>
                    ))}
                    {selectedEmployee.topApplications.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No apps recorded yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Enrolled Windows PCs */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Enrolled Windows Desktop Machines</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laptops and desktop computers reporting employee work telemetry
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Computer Name</th>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">OS & Agent</th>
                    <th className="px-6 py-3.5">Current Status</th>
                    <th className="px-6 py-3.5">Active Window</th>
                    <th className="px-6 py-3.5">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {desktopDevices.map(d => {
                    const st = getStatusBadge(d.currentStatus || 'OFFLINE');
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Laptop className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{d.hostname}</p>
                              <p className="text-xs font-mono text-slate-400">ID: {d.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                          {d.employee?.fullName || 'Unassigned'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          <p className="font-medium text-slate-700">{d.osName} {d.osVersion}</p>
                          <p className="text-slate-400">Agent v{d.appVersion}</p>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${st.bg}`}>
                            <span className={`h-2 w-2 rounded-full ${st.dot}`}></span>
                            {st.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {d.currentApp ? (
                            <div>
                              <span className="font-mono font-semibold text-slate-800">{d.currentApp}</span>
                              <p className="text-slate-400 truncate max-w-xs">{d.currentWindowTitle}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleTimeString() : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
                  {desktopDevices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No Windows desktop agents enrolled yet. Install the desktop agent in <code>apps/desktop</code> to link employee computers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

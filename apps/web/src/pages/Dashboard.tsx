import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Smartphone,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import {
  AnalyticsOverview,
  DailyCallTrend,
  EmployeePerformance,
  DeviceSyncHealth,
  CallEvent
} from '@callyzer/shared-types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DirectionBadge, OutcomeBadge } from '../components/Badge';

export const Dashboard: React.FC = () => {
  const { client, activeOrg } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<DailyCallTrend[]>([]);
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [syncHealth, setSyncHealth] = useState<DeviceSyncHealth[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [ov, tr, emp, sh, callsRes] = await Promise.all([
        client.getAnalyticsOverview(),
        client.getDailyTrends(),
        client.getEmployeePerformance(),
        client.getSyncHealth(),
        client.getCallEvents({ pageSize: 5 })
      ]);
      setOverview(ov);
      setTrends(tr);
      setEmployees(emp);
      setSyncHealth(sh);
      setRecentCalls(callsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg]);

  const pieData = overview ? [
    { name: 'Answered', value: overview.answeredCalls, color: '#10b981' },
    { name: 'Missed', value: overview.missedCalls, color: '#ef4444' },
    { name: 'Rejected', value: overview.rejectedCalls, color: '#f59e0b' }
  ].filter(d => d.value > 0) : [];

  const staleDevices = syncHealth.filter(d => d.syncStatus === 'CRITICAL' || d.syncStatus === 'WARNING');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Call Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time SIM call telematics for <span className="font-semibold text-slate-700">{activeOrg?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Timezone: {activeOrg?.timezone || 'UTC'}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Sync Health Notification if any device is delayed */}
      {staleDevices.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{staleDevices.length} device(s)</span> have delayed synchronization. Verify battery optimization or network connection on employee handsets.
            </p>
          </div>
          <a href="/devices" className="text-xs font-semibold text-amber-900 underline hover:no-underline shrink-0">
            View Devices &rarr;
          </a>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={overview?.totalCalls ?? 0}
          subtitle="All recorded events"
          icon={PhoneCall}
          variant="blue"
        />
        <StatCard
          title="Answered Calls"
          value={overview?.answeredCalls ?? 0}
          subtitle={`${overview && overview.totalCalls > 0 ? Math.round((overview.answeredCalls / overview.totalCalls) * 100) : 0}% answer rate`}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Missed Calls"
          value={overview?.missedCalls ?? 0}
          subtitle="Incoming unanswered"
          icon={PhoneMissed}
          variant="rose"
        />
        <StatCard
          title="Total Duration"
          value={overview ? formatDuration(overview.totalConnectedDurationSeconds) : '0m'}
          subtitle={`Avg: ${overview ? formatDuration(overview.avgConnectedDurationSeconds) : '0m'}`}
          icon={Clock}
          variant="purple"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Incoming Calls"
          value={overview?.incomingCalls ?? 0}
          icon={PhoneIncoming}
          variant="emerald"
        />
        <StatCard
          title="Outgoing Calls"
          value={overview?.outgoingCalls ?? 0}
          icon={PhoneOutgoing}
          variant="blue"
        />
        <StatCard
          title="Active Telecallers"
          value={overview?.activeEmployeesCount ?? 0}
          icon={Users}
          variant="slate"
        />
        <StatCard
          title="Enrolled Devices"
          value={overview?.enrolledDevicesCount ?? 0}
          icon={Smartphone}
          variant="slate"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Volume Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Daily Call Activity</h2>
              <p className="text-xs text-slate-500">Call volume patterns over recent days</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Past 7 Days</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMissed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="answered" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAnswered)" name="Answered" />
                <Area type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorMissed)" name="Missed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Outcome Distribution</h2>
            <p className="text-xs text-slate-500">Proportion of call results</p>
          </div>

          <div className="h-72 w-full flex-1 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400">No calls recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Telecaller Leaderboard & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telecaller Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Employee Activity Leaderboard</h2>
              <p className="text-xs text-slate-500">Top telecallers by connected volume</p>
            </div>
            <a href="/employees" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All &rarr;
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">Employee</th>
                  <th className="pb-3 font-semibold text-center">Total</th>
                  <th className="pb-3 font-semibold text-center">Answered</th>
                  <th className="pb-3 font-semibold text-right">Talk Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees.slice(0, 5).map(emp => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/50">
                    <td className="py-3 font-medium text-slate-900">
                      <div>
                        <p>{emp.employeeName}</p>
                        <p className="text-xs text-slate-400">{emp.teamName || 'General Team'}</p>
                      </div>
                    </td>
                    <td className="py-3 text-center font-semibold">{emp.totalCalls}</td>
                    <td className="py-3 text-center text-emerald-600 font-semibold">{emp.answeredCalls}</td>
                    <td className="py-3 text-right font-medium text-slate-600">
                      {formatDuration(emp.totalDurationSeconds)}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                      No employee telemetry available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Calls Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Call Stream</h2>
              <p className="text-xs text-slate-500">Latest synchronized SIM events</p>
            </div>
            <a href="/calls" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All History &rarr;
            </a>
          </div>

          <div className="space-y-3">
            {recentCalls.map(c => (
              <div key={c.id} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                    {c.direction === 'INCOMING' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 font-mono">{c.displayPhoneNumber}</p>
                    <p className="text-xs text-slate-400">
                      {c.employeeName || 'Telecaller'} • {new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <DirectionBadge direction={c.direction} />
                    <OutcomeBadge outcome={c.outcome} />
                  </div>
                  <p className="text-xs font-mono text-slate-500">{formatDuration(c.durationSeconds)}</p>
                </div>
              </div>
            ))}
            {recentCalls.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No call activity recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

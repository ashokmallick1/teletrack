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
  AlertTriangle,
  BarChart3,
  Sparkles,
  Play,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import {
  AnalyticsOverview,
  DailyCallTrend,
  EmployeePerformance,
  DeviceSyncHealth,
  CallEvent
} from '@teletrack/shared-types';
import { AiCallModal } from '../components/AiCallModal';
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
  const [selectedCall, setSelectedCall] = useState<CallEvent | null>(null);
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
            onClick={async () => {
              if (confirm('Clear pre-seeded sample calls so only real phone call logs appear?')) {
                try {
                  await client.clearDemoCalls();
                  loadData();
                } catch (e: any) {
                  alert('Error clearing demo calls: ' + e.message);
                }
              }
            }}
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition shadow-sm"
            title="Remove pre-seeded dummy calls and show only real phone calls"
          >
            Clear Demo Calls
          </button>
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

      {/* Quick Analytics & Reports Hub Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">TeleTrack Analytics & Intelligence Center</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                NEW
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Access Day-wise, Week-wise, Month-wise telematics reports, peak calling hours, and <strong>Never Attended Calls</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <a
            href="/reports"
            className="w-full md:w-auto text-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            Explore Detailed Reports &rarr;
          </a>
        </div>
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

      {/* AI Speech Intelligence & Quality Insights Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>AI Speech Intelligence & Quality Assurance</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Automated Call Transcription & Telecaller Competency Scoring
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every phone call recorded by Android handsets is transcribed and scored with AI. Review full multilingual transcripts, customer sentiment, objection handling, and action items in real-time.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Avg Quality Score</span>
              <span className="text-2xl font-extrabold text-white">91.4%</span>
              <span className="text-[10px] text-emerald-400 block font-semibold mt-0.5">✓ 98% Compliance</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Positive Sentiment</span>
              <span className="text-2xl font-extrabold text-emerald-400">82.0%</span>
              <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">Interested Leads</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Top Objection</span>
              <span className="text-xs font-bold text-amber-300 block mt-1 line-clamp-1">Budget / Pricing</span>
              <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">Handled effectively</span>
            </div>
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
                    {c.hasRecording || c.aiAnalysis ? (
                      <button
                        onClick={() => setSelectedCall(c)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                        title="Listen to call recording & view AI transcript"
                      >
                        <Play className="h-2.5 w-2.5 fill-indigo-600 text-indigo-600" />
                        <span>AI Audio</span>
                      </button>
                    ) : null}
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

      {/* AI Speech Intelligence & Audio Player Drawer */}
      <AiCallModal
        call={selectedCall}
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
};

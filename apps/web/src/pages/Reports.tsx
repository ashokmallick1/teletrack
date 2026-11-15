import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  AdvancedAnalyticsResponse,
  TimeGroupedReportItem,
  UnattendedCallItem,
  EmployeePerformance
} from '@teletrack/shared-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type ActiveTab = 'day-wise' | 'week-wise' | 'month-wise' | 'unattended' | 'hourly' | 'telecallers';
type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | '30days';

export const Reports: React.FC = () => {
  const { client, activeOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('day-wise');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [analytics, setAnalytics] = useState<AdvancedAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unattendedSearch, setUnattendedSearch] = useState('');

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m 00s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Compute dates based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (datePreset === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }
    if (datePreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === '30days') {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return {}; // 'all'
  }, [datePreset]);

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [repRes, empRes] = await Promise.all([
        client.getAdvancedAnalytics({
          ...dateRange,
          employeeId: selectedEmployeeId || undefined
        }),
        client.getEmployeePerformance(dateRange)
      ]);
      setAnalytics(repRes);
      setEmployees(empRes);
    } catch (err) {
      console.error('Failed to load advanced analytics reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg, datePreset, selectedEmployeeId]);

  // Export handlers
  const exportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportCurrentTab = () => {
    if (!analytics) return;

    if (activeTab === 'day-wise') {
      const headers = ['Date', 'Period Label', 'Total Calls', 'Incoming', 'Outgoing', 'Answered', 'Missed', 'Rejected', 'Answer Rate %', 'Total Duration', 'Avg Call Time', 'Unique Clients'];
      const rows = analytics.dayWise.map(d => [
        d.periodKey,
        d.periodLabel,
        d.totalCalls,
        d.incomingCalls,
        d.outgoingCalls,
        d.answeredCalls,
        d.missedCalls,
        d.rejectedCalls,
        `${d.answerRate}%`,
        formatDuration(d.totalDurationSeconds),
        formatDuration(d.avgDurationSeconds),
        d.uniqueNumbersCount
      ]);
      exportCsv('teletrack_day_wise_report', headers, rows);
    } else if (activeTab === 'week-wise') {
      const headers = ['Week', 'Period Label', 'Total Calls', 'Incoming', 'Outgoing', 'Answered', 'Missed', 'Rejected', 'Answer Rate %', 'Total Duration', 'Avg Call Time', 'Unique Clients'];
      const rows = analytics.weekWise.map(w => [
        w.periodKey,
        w.periodLabel,
        w.totalCalls,
        w.incomingCalls,
        w.outgoingCalls,
        w.answeredCalls,
        w.missedCalls,
        w.rejectedCalls,
        `${w.answerRate}%`,
        formatDuration(w.totalDurationSeconds),
        formatDuration(w.avgDurationSeconds),
        w.uniqueNumbersCount
      ]);
      exportCsv('teletrack_week_wise_report', headers, rows);
    } else if (activeTab === 'month-wise') {
      const headers = ['Month', 'Period Label', 'Total Calls', 'Incoming', 'Outgoing', 'Answered', 'Missed', 'Rejected', 'Answer Rate %', 'Total Duration', 'Avg Call Time', 'Unique Clients'];
      const rows = analytics.monthWise.map(m => [
        m.periodKey,
        m.periodLabel,
        m.totalCalls,
        m.incomingCalls,
        m.outgoingCalls,
        m.answeredCalls,
        m.missedCalls,
        m.rejectedCalls,
        `${m.answerRate}%`,
        formatDuration(m.totalDurationSeconds),
        formatDuration(m.avgDurationSeconds),
        m.uniqueNumbersCount
      ]);
      exportCsv('teletrack_month_wise_report', headers, rows);
    } else if (activeTab === 'unattended') {
      const headers = ['Phone Number', 'Lead Name', 'Missed At', 'Elapsed', 'Missed Attempts', 'Telecaller', 'Team'];
      const rows = analytics.unattendedCalls.map(u => [
        u.phoneNumber,
        u.leadName || 'Unassigned Lead',
        new Date(u.missedAt).toLocaleString(),
        u.timeElapsed,
        u.totalMissedAttempts,
        u.employeeName,
        u.teamName || 'General'
      ]);
      exportCsv('teletrack_never_attended_calls_report', headers, rows);
    } else {
      const headers = ['Telecaller', 'Team', 'Total Calls', 'Answered', 'Missed', 'Outgoing', 'Incoming', 'Answer Rate %', 'Total Connected Duration', 'Avg Duration'];
      const rows = employees.map(e => [
        e.employeeName,
        e.teamName || 'General',
        e.totalCalls,
        e.answeredCalls,
        e.missedCalls,
        e.outgoingCalls,
        e.incomingCalls,
        e.totalCalls > 0 ? `${Math.round((e.answeredCalls / e.totalCalls) * 100)}%` : '0%',
        formatDuration(e.totalDurationSeconds),
        formatDuration(e.avgDurationSeconds)
      ]);
      exportCsv('teletrack_telecaller_performance_report', headers, rows);
    }
  };

  const filteredUnattendedCalls = useMemo(() => {
    if (!analytics?.unattendedCalls) return [];
    if (!unattendedSearch.trim()) return analytics.unattendedCalls;
    const q = unattendedSearch.toLowerCase();
    return analytics.unattendedCalls.filter(
      u => u.phoneNumber.toLowerCase().includes(q) || (u.leadName && u.leadName.toLowerCase().includes(q))
    );
  }, [analytics?.unattendedCalls, unattendedSearch]);

  const DURATION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const durationPieData = useMemo(() => {
    if (!analytics?.durationBuckets) return [];
    const b = analytics.durationBuckets;
    return [
      { name: '< 30s (Short / Drops)', value: b.under30s },
      { name: '30s - 2m (Follow-ups)', value: b.between30sAnd2m },
      { name: '2m - 5m (Sales Pitch)', value: b.between2mAnd5m },
      { name: '> 5m (In-depth Closures)', value: b.over5m }
    ].filter(item => item.value > 0);
  }, [analytics?.durationBuckets]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Call Telematics & Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              TeleTrack BI
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated SIM telematics, multi-period productivity trends, and unattended call intelligence
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCurrentTab}
            disabled={loading || !analytics}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
          {(
            [
              { id: 'all', label: 'All History' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: '30days', label: 'Last 30 Days' }
            ] as const
          ).map(p => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                datePreset === p.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Employee selector */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>Telecaller:</span>
          </label>
          <select
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Telecallers ({employees.length})</option>
            {employees.map(e => (
              <option key={e.employeeId} value={e.employeeId}>
                {e.employeeName} ({e.totalCalls} calls)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Level Metric Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Volume</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.overview.totalCalls.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{analytics.overview.uniqueClientsCount} unique clients</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Answered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{analytics.overview.answeredCalls.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {analytics.overview.totalCalls > 0
                ? `${Math.round((analytics.overview.answeredCalls / analytics.overview.totalCalls) * 100)}% connection rate`
                : '0% rate'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Missed / Dropped</p>
            <p className="text-2xl font-bold text-rose-500 mt-1">{analytics.overview.missedCalls.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {analytics.overview.rejectedCalls} rejected
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Talk Time</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {Math.floor(analytics.overview.totalDurationSeconds / 3600)}h {Math.floor((analytics.overview.totalDurationSeconds % 3600) / 60)}m
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Avg {formatDuration(analytics.overview.avgConnectedDurationSeconds)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Inbound vs Outbound</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold text-slate-800">{analytics.overview.incomingCalls}</span>
              <span className="text-xs text-slate-400 font-semibold">in</span>
              <span className="text-slate-300">/</span>
              <span className="text-lg font-bold text-slate-800">{analytics.overview.outgoingCalls}</span>
              <span className="text-xs text-slate-400 font-semibold">out</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {Math.floor(analytics.overview.inboundDurationSeconds / 3600)}h in • {Math.floor(analytics.overview.outboundDurationSeconds / 3600)}h out
            </p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-rose-800">Calls Not Attended</p>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700 mt-1">{analytics.overview.neverAttendedCount}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              Never called back
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('day-wise')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'day-wise'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Day-wise Report</span>
          {analytics && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-bold">{analytics.dayWise.length}</span>}
        </button>

        <button
          onClick={() => setActiveTab('week-wise')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'week-wise'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Week-wise Report</span>
          {analytics && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-bold">{analytics.weekWise.length}</span>}
        </button>

        <button
          onClick={() => setActiveTab('month-wise')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'month-wise'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Month-wise Report</span>
          {analytics && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-bold">{analytics.monthWise.length}</span>}
        </button>

        <button
          onClick={() => setActiveTab('unattended')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'unattended'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <PhoneMissed className="h-4 w-4 text-rose-500" />
          <span>Never Attended Calls</span>
          {analytics && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700 font-bold">
              {analytics.overview.neverAttendedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('hourly')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'hourly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Peak Hours & Duration</span>
        </button>

        <button
          onClick={() => setActiveTab('telecallers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'telecallers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Telecaller Matrix</span>
        </button>
      </div>

      {/* TAB CONTENT: Day-wise */}
      {activeTab === 'day-wise' && analytics && (
        <div className="space-y-6">
          {/* Day chart preview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Daily Telecalling Volume Trend</h3>
                <p className="text-xs text-slate-500">Answered vs Missed calling volume across days</p>
              </div>
              <span className="text-xs font-medium text-slate-400">Total {analytics.dayWise.length} Active Days</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...analytics.dayWise].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="periodKey" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="answeredCalls" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Answered Calls" />
                  <Area type="monotone" dataKey="missedCalls" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Missed Calls" />
                  <Area type="monotone" dataKey="outgoingCalls" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Outgoing Calls" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day-wise Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Day-wise Breakdown</h3>
              <span className="text-xs text-slate-400">{analytics.dayWise.length} recorded dates</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-center">Total</th>
                    <th className="px-6 py-3.5 text-center">Inbound</th>
                    <th className="px-6 py-3.5 text-center">Outbound</th>
                    <th className="px-6 py-3.5 text-center">Answered</th>
                    <th className="px-6 py-3.5 text-center">Missed</th>
                    <th className="px-6 py-3.5 text-center">Answer Rate</th>
                    <th className="px-6 py-3.5 text-right">Talk Time</th>
                    <th className="px-6 py-3.5 text-right">Avg Call</th>
                    <th className="px-6 py-3.5 text-center">Unique Numbers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {analytics.dayWise.map(d => (
                    <tr key={d.periodKey} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                        {d.periodLabel}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-bold text-slate-800">
                        {d.totalCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-slate-600">
                        {d.incomingCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-blue-600 font-medium">
                        {d.outgoingCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-emerald-600 font-semibold">
                        {d.answeredCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-rose-500 font-semibold">
                        {d.missedCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          d.answerRate >= 60 ? 'bg-emerald-50 text-emerald-700' : d.answerRate >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {d.answerRate}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-slate-700">
                        {formatDuration(d.totalDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-xs text-slate-500">
                        {formatDuration(d.avgDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-medium text-slate-600">
                        {d.uniqueNumbersCount}
                      </td>
                    </tr>
                  ))}
                  {analytics.dayWise.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-sm text-slate-400">
                        No call activity in this selected date range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Week-wise */}
      {activeTab === 'week-wise' && analytics && (
        <div className="space-y-6">
          {/* Week chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Weekly Call Aggregate Trend</h3>
            <p className="text-xs text-slate-500 mb-4">Total calls vs Connected answered volume week-over-week</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...analytics.weekWise].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="periodKey" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="totalCalls" fill="#94a3b8" name="Total Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="answeredCalls" fill="#10b981" name="Answered Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missedCalls" fill="#ef4444" name="Missed Calls" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Week table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Week-wise Productivity Matrix</h3>
              <span className="text-xs text-slate-400">{analytics.weekWise.length} weeks recorded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Calendar Week</th>
                    <th className="px-6 py-3.5 text-center">Total</th>
                    <th className="px-6 py-3.5 text-center">Inbound</th>
                    <th className="px-6 py-3.5 text-center">Outbound</th>
                    <th className="px-6 py-3.5 text-center">Answered</th>
                    <th className="px-6 py-3.5 text-center">Missed</th>
                    <th className="px-6 py-3.5 text-center">Connection Rate</th>
                    <th className="px-6 py-3.5 text-right">Talk Time</th>
                    <th className="px-6 py-3.5 text-right">Avg Call</th>
                    <th className="px-6 py-3.5 text-center">Unique Contacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {analytics.weekWise.map(w => (
                    <tr key={w.periodKey} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                        {w.periodLabel}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-bold text-slate-800">
                        {w.totalCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-slate-600">
                        {w.incomingCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-blue-600 font-medium">
                        {w.outgoingCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-emerald-600 font-semibold">
                        {w.answeredCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-rose-500 font-semibold">
                        {w.missedCalls}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {w.answerRate}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-slate-700">
                        {formatDuration(w.totalDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-xs text-slate-500">
                        {formatDuration(w.avgDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-medium text-slate-600">
                        {w.uniqueNumbersCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Month-wise */}
      {activeTab === 'month-wise' && analytics && (
        <div className="space-y-6">
          {/* Month cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.monthWise.map(m => (
              <div key={m.periodKey} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">{m.periodLabel}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {m.answerRate}% Answer Rate
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Total Calls</p>
                    <p className="text-xl font-bold text-slate-900">{m.totalCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Connected</p>
                    <p className="text-xl font-bold text-emerald-600">{m.answeredCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Duration</p>
                    <p className="text-sm font-bold text-blue-600">{formatDuration(m.totalDurationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Unique Clients</p>
                    <p className="text-sm font-bold text-slate-800">{m.uniqueNumbersCount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex justify-between pt-2 border-t border-slate-100">
                  <span>In: {m.incomingCalls}</span>
                  <span>Out: {m.outgoingCalls}</span>
                  <span>Missed: {m.missedCalls}</span>
                  <span>Avg: {formatDuration(m.avgDurationSeconds)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Month-wise Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Monthly Executive Summary</h3>
              <span className="text-xs text-slate-400">{analytics.monthWise.length} months recorded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Month</th>
                    <th className="px-6 py-3.5 text-center">Total Volume</th>
                    <th className="px-6 py-3.5 text-center">Inbound</th>
                    <th className="px-6 py-3.5 text-center">Outbound</th>
                    <th className="px-6 py-3.5 text-center">Answered</th>
                    <th className="px-6 py-3.5 text-center">Missed</th>
                    <th className="px-6 py-3.5 text-center">Connection Rate</th>
                    <th className="px-6 py-3.5 text-right">Total Duration</th>
                    <th className="px-6 py-3.5 text-right">Avg Call</th>
                    <th className="px-6 py-3.5 text-center">Unique Clients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {analytics.monthWise.map(m => (
                    <tr key={m.periodKey} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                        {m.periodLabel}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-bold text-slate-800">
                        {m.totalCalls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-slate-600">
                        {m.incomingCalls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-blue-600 font-medium">
                        {m.outgoingCalls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-emerald-600 font-semibold">
                        {m.answeredCalls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center text-rose-500 font-semibold">
                        {m.missedCalls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {m.answerRate}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-slate-700">
                        {formatDuration(m.totalDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-xs text-slate-500">
                        {formatDuration(m.avgDurationSeconds)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-medium text-slate-600">
                        {m.uniqueNumbersCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Never Attended Calls */}
      {activeTab === 'unattended' && analytics && (
        <div className="space-y-6">
          {/* Explanation Alert */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-900">What are Never Attended Calls?</h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                These are prospective clients who called your company and had their call <strong>missed or rejected</strong>, and have <strong>NEVER been called back</strong> by any telecaller in your organisation. Calling these numbers back recovers lost leads and improves customer retention.
              </p>
            </div>
          </div>

          {/* Search & Counter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={unattendedSearch}
                onChange={e => setUnattendedSearch(e.target.value)}
                placeholder="Search phone number or lead name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <span className="text-xs text-slate-500">
              Showing <strong>{filteredUnattendedCalls.length}</strong> unattended client(s)
            </span>
          </div>

          {/* Unattended Calls Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Client Phone Number</th>
                    <th className="px-6 py-3.5">Lead / CRM Contact</th>
                    <th className="px-6 py-3.5">Missed Timestamp</th>
                    <th className="px-6 py-3.5 text-center">Unreturned Duration</th>
                    <th className="px-6 py-3.5 text-center">Missed Attempts</th>
                    <th className="px-6 py-3.5">Assigned Telecaller</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {filteredUnattendedCalls.slice(0, 100).map((u, i) => (
                    <tr key={i} className="hover:bg-rose-50/30 transition">
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono font-semibold text-slate-900">
                        {u.phoneNumber}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                        {u.leadName || (
                          <span className="text-xs text-slate-400 italic">Unidentified Prospect</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(u.missedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                          {u.timeElapsed}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center font-bold text-slate-800">
                        {u.totalMissedAttempts > 1 ? (
                          <span className="text-rose-600 font-bold">{u.totalMissedAttempts} calls</span>
                        ) : (
                          '1 call'
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-slate-700">
                        {u.employeeName}
                        {u.teamName && <span className="text-slate-400 ml-1">({u.teamName})</span>}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <a
                          href={`/calls?search=${encodeURIComponent(u.phoneNumber)}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <span>History</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                  {filteredUnattendedCalls.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">All missed calls have been attended!</p>
                        <p className="text-xs text-slate-400 mt-1">No pending unreturned client calls found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredUnattendedCalls.length > 100 && (
              <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
                Displaying first 100 of {filteredUnattendedCalls.length} unattended records. Use "Export Report CSV" above to download all records.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Peak Hours & Duration */}
      {activeTab === 'hourly' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly calling chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Hourly Calling Distribution</h3>
                  <p className="text-xs text-slate-500">24-hour calling volume and connection rate patterns</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50">
                  Peak Calling Times
                </span>
              </div>
              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} tickFormatter={h => `${h}:00`} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      formatter={(val, name) => [val, name]}
                      labelFormatter={h => `${h}:00 - ${(Number(h) + 1) % 24}:00`}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="answered" fill="#10b981" name="Answered Calls" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="missed" fill="#ef4444" name="Missed / Rejected" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Duration Buckets Pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <div className="mb-2">
                <h3 className="text-base font-semibold text-slate-900">Call Duration Buckets</h3>
                <p className="text-xs text-slate-500">Proportion of call talk times</p>
              </div>
              <div className="h-60 w-full flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={durationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {durationPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DURATION_COLORS[index % DURATION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                {durationPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: DURATION_COLORS[i] }}></span>
                    <span className="text-slate-600 truncate">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Day of Week Analysis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Day of Week Performance</h3>
            <p className="text-xs text-slate-500 mb-4">Volume and answer rates from Monday to Sunday</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {analytics.dayOfWeekDistribution.map(dow => (
                <div key={dow.dayName} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{dow.dayName.slice(0, 3)}</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{dow.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">calls</p>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-semibold">{dow.answered} ans</span>
                    <span className="font-bold text-slate-700">{dow.answerRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Telecaller Matrix */}
      {activeTab === 'telecallers' && (
        <div className="space-y-6">
          {/* Comparison Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Telecaller Activity Comparison</h3>
            <p className="text-xs text-slate-500 mb-6">Answered vs Missed vs Outgoing call volume per telecaller</p>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employees} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="employeeName" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="answeredCalls" fill="#10b981" name="Answered Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missedCalls" fill="#ef4444" name="Missed Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outgoingCalls" fill="#3b82f6" name="Outgoing Calls" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Telecaller Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Telecaller Productivity Matrix</h3>
              <span className="text-xs text-slate-400">Total {employees.length} telecallers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Telecaller</th>
                    <th className="px-6 py-3.5">Team</th>
                    <th className="px-6 py-3.5 text-center">Total</th>
                    <th className="px-6 py-3.5 text-center">Inbound</th>
                    <th className="px-6 py-3.5 text-center">Outbound</th>
                    <th className="px-6 py-3.5 text-center">Answered</th>
                    <th className="px-6 py-3.5 text-center">Missed</th>
                    <th className="px-6 py-3.5 text-center">Answer Rate</th>
                    <th className="px-6 py-3.5 text-right">Talk Time</th>
                    <th className="px-6 py-3.5 text-right">Avg Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {employees.map(e => {
                    const answerRate = e.totalCalls > 0 ? Math.round((e.answeredCalls / e.totalCalls) * 100) : 0;
                    return (
                      <tr key={e.employeeId} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                          {e.employeeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {e.teamName || 'General'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                          {e.totalCalls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">
                          {e.incomingCalls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-blue-600 font-medium">
                          {e.outgoingCalls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-emerald-600 font-semibold">
                          {e.answeredCalls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-rose-500 font-semibold">
                          {e.missedCalls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                            {answerRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-medium text-slate-700">
                          {formatDuration(e.totalDurationSeconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-xs text-slate-500">
                          {formatDuration(e.avgDurationSeconds)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

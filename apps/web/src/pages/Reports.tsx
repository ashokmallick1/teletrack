import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Percent
} from 'lucide-react';
import { EmployeePerformance, DailyCallTrend } from '@callyzer/shared-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const Reports: React.FC = () => {
  const { client, activeOrg } = useAuth();
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [trends, setTrends] = useState<DailyCallTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [empRes, trendsRes] = await Promise.all([
        client.getEmployeePerformance(),
        client.getDailyTrends()
      ]);
      setEmployees(empRes);
      setTrends(trendsRes);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg]);

  const handleExportEmployeeReport = () => {
    const rows = employees.map(e => ({
      Employee: e.employeeName,
      Team: e.teamName || 'General',
      TotalCalls: e.totalCalls,
      AnsweredCalls: e.answeredCalls,
      MissedCalls: e.missedCalls,
      AnswerRate: e.totalCalls > 0 ? `${Math.round((e.answeredCalls / e.totalCalls) * 100)}%` : '0%',
      TotalDurationSeconds: e.totalDurationSeconds,
      TotalDuration: formatDuration(e.totalDurationSeconds),
      AvgDuration: formatDuration(e.avgDurationSeconds)
    }));

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telecaller_performance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Telecalling Analytics Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Productivity and performance metrics aggregated by telecaller and department
          </p>
        </div>
        <button
          onClick={handleExportEmployeeReport}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export Performance CSV</span>
        </button>
      </div>

      {/* Comparison Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Telecaller Activity Comparison</h2>
        <p className="text-xs text-slate-500 mb-6">Answered vs Missed/Unanswered call distribution</p>

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

      {/* Comprehensive Telecaller Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Employee Activity Summary</h3>
          <span className="text-xs text-slate-400">Total {employees.length} telecallers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Telecaller</th>
                <th className="px-6 py-3.5">Team</th>
                <th className="px-6 py-3.5 text-center">Total Calls</th>
                <th className="px-6 py-3.5 text-center">Answered</th>
                <th className="px-6 py-3.5 text-center">Missed</th>
                <th className="px-6 py-3.5 text-center">Answer Rate</th>
                <th className="px-6 py-3.5 text-right">Total Connected Time</th>
                <th className="px-6 py-3.5 text-right">Avg Call Time</th>
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
  );
};

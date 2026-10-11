import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CallEvent, CallDirection, CallOutcome } from '@callyzer/shared-types';
import { DirectionBadge, OutcomeBadge } from '../components/Badge';

export const CallHistory: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('');
  const [showMasked, setShowMasked] = useState(activeOrg?.maskPhoneNumbers ?? false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const loadCalls = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize: 15
      };
      if (search) params.search = search;
      if (direction) params.direction = direction;
      if (outcome) params.outcome = outcome;

      const res = await client.getCallEvents(params);
      setCalls(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load call events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [activeOrg, page, direction, outcome]);

  const handleExportCsv = async () => {
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (direction) params.direction = direction;
      if (outcome) params.outcome = outcome;

      const csvData = await client.exportCallEventsCsv(params);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_logs_${activeOrg?.slug}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCalls();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Call History & Telematics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search and export {totalCount} verified SIM call records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadCalls}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition"
            title="Refresh logs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search phone number, employee name, or lead..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <select
            value={direction}
            onChange={e => { setDirection(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Directions</option>
            <option value="INCOMING">Incoming</option>
            <option value="OUTGOING">Outgoing</option>
            <option value="MISSED">Missed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={outcome}
            onChange={e => { setOutcome(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Outcomes</option>
            <option value="ANSWERED">Answered</option>
            <option value="MISSED">Missed</option>
            <option value="REJECTED">Rejected</option>
            <option value="BUSY">Busy</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Phone Number</th>
                <th className="px-6 py-3.5">Direction</th>
                <th className="px-6 py-3.5">Outcome</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">SIM / Device</th>
                <th className="px-6 py-3.5">Associated Lead</th>
                <th className="px-6 py-3.5">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {calls.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    <p className="font-medium text-slate-800">
                      {new Date(c.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p>{new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-slate-900">{c.employeeName || 'Telecaller'}</p>
                    <p className="text-xs text-slate-400">{c.teamName || 'General'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-semibold text-slate-900">
                    {c.displayPhoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <DirectionBadge direction={c.direction} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OutcomeBadge outcome={c.outcome} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-700 font-medium">
                    {formatDuration(c.durationSeconds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    <p className="font-medium text-slate-700">{c.simCarrier || 'Default SIM'}</p>
                    <p className="truncate max-w-[140px] text-slate-400">{c.deviceName || 'Android Device'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    {c.leadName ? (
                      <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {c.leadName}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                      {c.dataSource}
                    </span>
                  </td>
                </tr>
              ))}
              {calls.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">
                    No call logs matching the filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-800">{page}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

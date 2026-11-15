import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Plus,
  Upload,
  Search,
  MessageSquare,
  Calendar,
  Building,
  Phone,
  Clock,
  CheckCircle2,
  Send
} from 'lucide-react';
import { Lead, LeadStatus, LeadNote, OrganizationMembership } from '@teletrack/shared-types';
import { LeadStatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const Leads: React.FC = () => {
  const { client, activeOrg } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeLeadNotes, setActiveLeadNotes] = useState<Lead | null>(null);
  const [notesList, setNotesList] = useState<LeadNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Add Lead form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<LeadStatus>('NEW');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');

  // Import CSV form
  const [csvContent, setCsvContent] = useState('');
  const [importResult, setImportResult] = useState<{ inserted: number; errors: number } | null>(null);

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [leadsRes, emps] = await Promise.all([
        client.getLeads({
          page,
          pageSize: 15,
          search: search || undefined,
          status: (statusFilter as LeadStatus) || undefined
        }),
        client.getEmployees()
      ]);
      setLeads(leadsRes.data);
      setTotalPages(leadsRes.totalPages);
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg, page, statusFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.createLead({
        name,
        phoneNumber: phone,
        company: company || undefined,
        email: email || undefined,
        status,
        assignedEmployeeId: assignedEmployeeId || undefined
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setCompany('');
      setEmail('');
      loadData();
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  const handleOpenNotes = async (lead: Lead) => {
    setActiveLeadNotes(lead);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}/notes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teletrack_token')}`,
          'x-organization-id': activeOrg!.id
        }
      });
      if (res.ok) {
        const notes = await res.json();
        setNotesList(notes);
      }
    } catch (err) {
      console.error('Failed to load lead notes:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeadNotes || !newNoteText.trim()) return;
    try {
      const note = await client.addLeadNote(activeLeadNotes.id, newNoteText);
      setNotesList([note, ...notesList]);
      setNewNoteText('');
      loadData();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) return;
    try {
      const res = await fetch('/api/v1/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('teletrack_token')}`,
          'x-organization-id': activeOrg!.id
        },
        body: JSON.stringify({ csv: csvContent })
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        loadData();
      }
    } catch (err) {
      console.error('Failed to import CSV:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Telecalling & CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track customer interactions, automatic call linking, notes and follow-ups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={e => { e.preventDefault(); setPage(1); loadData(); }} className="flex-1 w-full relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lead name, phone number, company..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
          />
        </form>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="CONTACTED">CONTACTED</option>
          <option value="QUALIFIED">QUALIFIED</option>
          <option value="PROPOSAL">PROPOSAL</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
        </select>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Lead Name</th>
                <th className="px-6 py-3.5">Phone Number</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Assigned Telecaller</th>
                <th className="px-6 py-3.5">Total Talk Time</th>
                <th className="px-6 py-3.5">Calls</th>
                <th className="px-6 py-3.5">Follow-Up</th>
                <th className="px-6 py-3.5 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {leads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-slate-900">{l.name}</p>
                    <p className="text-xs text-slate-400">{l.company || l.email || 'Individual'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-semibold text-slate-900">
                    {l.phoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LeadStatusBadge status={l.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                    {l.assignedEmployee?.fullName || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-600">
                    {formatDuration(l.totalDurationSeconds || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-blue-600">
                    {l.totalCallsCount || 0} calls
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {l.followUpAt ? new Date(l.followUpAt).toLocaleDateString() : 'None'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                    <button
                      onClick={() => handleOpenNotes(l)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                      <span>{l.notesCount || 0} Notes</span>
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No leads found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Lead"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Deepak Verma"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Phone Number (SIM Dialable)</label>
            <input
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+919811122233"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Verma Tech"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none bg-white"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="WON">WON</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Assign Telecaller</label>
            <select
              value={assignedEmployeeId}
              onChange={e => setAssignedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.user?.fullName} ({e.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              Save Lead
            </button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Leads from CSV"
        description="Paste comma-separated rows. Required headers: name, phone (or phoneNumber). Optional: company, email, status."
      >
        <div className="space-y-4">
          {importResult ? (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
              <p className="font-semibold text-base">Import Completed</p>
              <p className="text-sm">
                Successfully added <span className="font-bold">{importResult.inserted}</span> leads. (Errors: {importResult.errors})
              </p>
            </div>
          ) : (
            <>
              <textarea
                rows={6}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                placeholder={`name,phone,company,email\nRajesh Kumar,+919876543210,Kumar Enterprises,rajesh@kumar.com\nAnita Roy,+919822334455,Roy Industries,anita@roy.in`}
                className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Process Import
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Lead Notes Interaction Modal */}
      <Modal
        isOpen={!!activeLeadNotes}
        onClose={() => setActiveLeadNotes(null)}
        title={`Interaction Notes: ${activeLeadNotes?.name}`}
        description={`Telecalling logs & notes history for ${activeLeadNotes?.phoneNumber}`}
      >
        <div className="space-y-4">
          {/* Add note input */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              required
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              placeholder="Enter call outcome note or follow-up details..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-semibold shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>Post</span>
            </button>
          </form>

          {/* Notes stream */}
          <div className="max-h-64 overflow-y-auto space-y-3 pt-2">
            {notesList.map(n => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-700">{n.authorName || 'Telecaller'}</span>
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{n.note}</p>
              </div>
            ))}
            {notesList.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No interaction notes recorded yet.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

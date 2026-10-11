import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Users, Mail, CheckCircle2 } from 'lucide-react';
import { OrganizationMembership, Team, UserRole } from '@callyzer/shared-types';
import { Modal } from '../components/Modal';

export const Employees: React.FC = () => {
  const { client, activeOrg, activeMembership } = useAuth();
  const [employees, setEmployees] = useState<OrganizationMembership[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [teamId, setTeamId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManageEmployees = activeMembership?.role === 'ORG_OWNER' || activeMembership?.role === 'ORG_ADMIN';

  const loadData = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [members, tms] = await Promise.all([
        client.getEmployees(),
        client.getTeams()
      ]);
      setEmployees(members);
      setTeams(tms);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    try {
      await client.inviteEmployee({
        fullName,
        email,
        role,
        teamId: teamId || undefined
      });
      setInviteSuccess(true);
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess(false);
        setFullName('');
        setEmail('');
        setEmployeeCode('');
        loadData();
      }, 1200);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite employee');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees & Telecallers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage telecallers, permissions, and team allocations
          </p>
        </div>
        {canManageEmployees && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Employee</span>
          </button>
        )}
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Team</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {employees.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {m.user?.fullName?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{m.user?.fullName || 'Invited User'}</p>
                        <p className="text-xs text-slate-400">{m.user?.email || m.invitedEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                    {m.team?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                    {m.employeeCode || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Employee to Organization"
        description="Employee will be able to enroll their Android device using their authorized account."
      >
        {inviteSuccess ? (
          <div className="py-6 text-center text-emerald-600 space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto" />
            <p className="font-semibold text-base">Employee Invited Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200">
                {inviteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ramesh@company.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Telecaller)</option>
                  <option value="MANAGER">MANAGER (Team Lead)</option>
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Team</label>
                <select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">No Team</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

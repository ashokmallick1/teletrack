import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Users,
  CheckCircle2,
  Smartphone,
  Monitor,
  QrCode,
  KeyRound,
  Copy,
  Check,
  Edit3,
  Download,
  PhoneCall,
  FolderPlus,
  Search,
  Share2,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Laptop,
  CheckSquare
} from 'lucide-react';
import { OrganizationMembership, Team, UserRole, EmployeeCredentials } from '@teletrack/shared-types';
import { Modal } from '../components/Modal';

export const Employees: React.FC = () => {
  const { client, activeOrg, activeMembership, user } = useAuth();
  const [employees, setEmployees] = useState<OrganizationMembership[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Copy states
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Invite / Add Employee Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pass@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [teamId, setTeamId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Post-Creation Welcome Credentials Card Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    username: string;
    email: string;
    password?: string;
    role: string;
    orgSlug: string;
    orgName: string;
    apkDownloadUrl: string;
    desktopDownloadUrl: string;
    webPortalUrl: string;
  } | null>(null);
  const [copiedWelcomeMsg, setCopiedWelcomeMsg] = useState(false);

  // Edit Employee Modal
  const [editingMember, setEditingMember] = useState<OrganizationMembership | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('EMPLOYEE');
  const [editTeamId, setEditTeamId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password Modal
  const [resetModalMember, setResetModalMember] = useState<OrganizationMembership | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{
    fullName: string;
    username: string;
    email: string;
    password: string;
  } | null>(null);
  const [copiedResetMsg, setCopiedResetMsg] = useState(false);

  // Enrollment Token Modal
  const [tokenEmployee, setTokenEmployee] = useState<OrganizationMembership | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  // Create Team Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

  const canManageEmployees =
    user?.isSuperAdmin ||
    activeMembership?.role === 'ORG_OWNER' ||
    activeMembership?.role === 'ORG_ADMIN';

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

  // Generate friendly random password e.g. Pass@4821
  const generateRandomPassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `Pass@${num}`;
  };

  const handleOpenAddModal = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword(generateRandomPassword());
    setShowPassword(false);
    setRole('EMPLOYEE');
    setTeamId('');
    setEmployeeCode('');
    setInviteError(null);
    setIsInviteModalOpen(true);
  };

  // Auto-generate username from full name if username is empty or unmodified
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (suggested && (!username || username === fullName.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      setUsername(suggested);
      if (!email || email.includes('@')) {
        setEmail(`${suggested}@${activeOrg?.slug || 'company'}.local`);
      }
    }
  };

  const handleCopyJoinCode = () => {
    if (!activeOrg?.slug) return;
    navigator.clipboard.writeText(activeOrg.slug);
    setCopiedJoinCode(true);
    setTimeout(() => setCopiedJoinCode(false), 2000);
  };

  const buildWelcomeMessage = (creds: {
    fullName: string;
    username: string;
    email: string;
    password?: string;
    orgSlug?: string;
    orgName?: string;
  }) => {
    return `👋 *Welcome to TeleTrack!*
🏢 *Company:* ${creds.orgName || activeOrg?.name}
👤 *Name:* ${creds.fullName}
🆔 *User ID:* ${creds.username}
📧 *Email:* ${creds.email}
🔑 *Password:* ${creds.password || '(Contact Admin)'}
🏢 *Organization Join Code:* ${creds.orgSlug || activeOrg?.slug}

📱 *Mobile App (Android APK):*
https://teletrack.bhashaai.in/teletrack.apk

💻 *Windows Desktop Tracker:*
https://teletrack.bhashaai.in/teletrack-desktop.zip

🌐 *Web Portal:*
https://teletrack.bhashaai.in
`;
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      const cleanEmail = email.trim() || `${cleanUsername || 'user'}@${activeOrg?.slug || 'teletrack'}.local`;
      const pass = password.trim() || generateRandomPassword();

      const res = await client.inviteEmployee({
        fullName: fullName.trim(),
        username: cleanUsername || undefined,
        email: cleanEmail,
        password: pass,
        role,
        teamId: teamId || undefined,
        employeeCode: employeeCode.trim() || (cleanUsername ? cleanUsername.toUpperCase() : undefined)
      });

      setIsInviteModalOpen(false);
      setCreatedCredentials({
        fullName: fullName.trim(),
        username: res.credentials?.username || cleanUsername || cleanEmail.split('@')[0],
        email: res.credentials?.email || cleanEmail,
        password: pass,
        role,
        orgSlug: activeOrg?.slug || '',
        orgName: activeOrg?.name || 'Company',
        apkDownloadUrl: 'https://teletrack.bhashaai.in/teletrack.apk',
        desktopDownloadUrl: 'https://teletrack.bhashaai.in/teletrack-desktop.zip',
        webPortalUrl: 'https://teletrack.bhashaai.in'
      });
      loadData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to add employee account');
    } finally {
      setInviteLoading(false);
    }
  };

  const openResetPasswordModal = (m: OrganizationMembership) => {
    setResetModalMember(m);
    setResetPasswordVal(generateRandomPassword());
    setResetResult(null);
    setCopiedResetMsg(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalMember) return;
    setResetLoading(true);
    try {
      const res = await client.resetEmployeePassword(resetModalMember.id, resetPasswordVal.trim());
      setResetResult({
        fullName: resetModalMember.user?.fullName || 'Telecaller',
        username: res.credentials?.username || resetModalMember.user?.username || resetModalMember.user?.email.split('@')[0] || '',
        email: resetModalMember.user?.email || '',
        password: res.password
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyCredentialsQuick = (m: OrganizationMembership) => {
    const uName = m.user?.username || m.user?.email.split('@')[0] || '';
    const text = buildWelcomeMessage({
      fullName: m.user?.fullName || 'Telecaller',
      username: uName,
      email: m.user?.email || '',
      password: 'Password123! (or assigned password)',
      orgSlug: activeOrg?.slug,
      orgName: activeOrg?.name
    });
    navigator.clipboard.writeText(text);
    setCopiedShareId(m.id);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  const openEditModal = (m: OrganizationMembership) => {
    setEditingMember(m);
    setEditRole(m.role);
    setEditTeamId(m.teamId || '');
    setEditCode(m.employeeCode || '');
    setEditError(null);
    setEditSuccess(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await client.updateEmployee(editingMember.id, {
        role: editRole,
        teamId: editTeamId || null,
        employeeCode: editCode || undefined
      });
      setEditSuccess(true);
      setTimeout(() => {
        setEditingMember(null);
        setEditSuccess(false);
        loadData();
      }, 800);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update employee');
    } finally {
      setEditLoading(false);
    }
  };

  const handleQuickToken = async (m: OrganizationMembership) => {
    setTokenEmployee(m);
    setGeneratedToken(null);
    setTokenLoading(true);
    try {
      const res = await client.generateEnrollmentToken(m.id);
      setGeneratedToken(res.token);
    } catch (err) {
      console.error('Failed to generate token:', err);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setTeamLoading(true);
    try {
      await client.createTeam({
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined
      });
      setIsTeamModalOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      loadData();
    } catch (err) {
      console.error('Failed to create team:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  const formatHours = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(m => {
      const name = m.user?.fullName?.toLowerCase() || '';
      const emailStr = m.user?.email?.toLowerCase() || '';
      const uName = m.user?.username?.toLowerCase() || '';
      const code = m.employeeCode?.toLowerCase() || '';
      const tName = m.team?.name?.toLowerCase() || '';
      return (
        name.includes(q) ||
        emailStr.includes(q) ||
        uName.includes(q) ||
        code.includes(q) ||
        tName.includes(q)
      );
    });
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees & Telecallers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create user accounts, set credentials, and track synced Android handsets and Windows desktop PCs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/teletrack.apk?v=3"
            download="teletrack.apk"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition"
            title="Download Android Handset Call Tracker APK"
          >
            <Smartphone className="h-4 w-4" />
            <span>Android APK</span>
          </a>
          <a
            href="/teletrack-desktop.zip"
            download="teletrack-desktop.zip"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
            title="Download Windows PC Activity & Productivity Agent"
          >
            <Laptop className="h-4 w-4" />
            <span>Windows Desktop App</span>
          </a>
          {canManageEmployees && (
            <>
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition"
              >
                <FolderPlus className="h-4 w-4 text-slate-500" />
                <span>New Team</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Employee / User</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Onboarding & Join Code Banner */}
      {activeOrg && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 rounded-2xl border border-blue-200/80 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <Users className="h-4 w-4" />
                <span>Multi-Device Telecaller Authentication & Data Sync</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                How telecallers sign into Android & Windows PC for {activeOrg.name}
              </h3>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                Click <strong>Add Employee / User</strong> to create an account with a <strong>User ID</strong> and <strong>Password</strong>.
                Telecallers can log into both the <strong>TeleTrack Android App</strong> (to sync calls & talk time) and the <strong>Windows Desktop Agent</strong> (to sync active apps & work hours). Once logged in, all activity syncs automatically to this portal!
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-indigo-200 shadow-sm shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Organization Join Code
                </p>
                <p className="font-mono text-lg font-extrabold text-indigo-700">
                  {activeOrg.slug}
                </p>
              </div>
              <button
                onClick={handleCopyJoinCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                {copiedJoinCode ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Toolbar & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, user ID, email, team, code..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing <strong>{filteredEmployees.length}</strong> of {employees.length} telecallers</span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Telecaller & User ID</th>
                <th className="px-6 py-3.5">Role & Team</th>
                <th className="px-6 py-3.5">📱 Mobile Handset</th>
                <th className="px-6 py-3.5">💻 Windows PC</th>
                <th className="px-6 py-3.5 text-center">Synced Calls</th>
                {canManageEmployees && <th className="px-6 py-3.5 text-right">Admin Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredEmployees.map(m => {
                const empMobileDevices = m.devices || [];
                const empDesktopDevices = m.desktopDevices || [];
                const uName = m.user?.username || m.user?.email.split('@')[0] || '';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    {/* Column 1: Telecaller info & User ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200 shadow-sm shrink-0">
                          {m.user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{m.user?.fullName || 'Telecaller'}</p>
                            {uName && (
                              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                @{uName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{m.user?.email || m.invitedEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Role & Team */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                          {m.role}
                        </span>
                        <div className="text-xs text-slate-600 font-medium">
                          {m.team?.name || <span className="text-slate-400">General Team</span>}
                          {m.employeeCode && (
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">({m.employeeCode})</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Mobile Handset */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {empMobileDevices.length > 0 ? (
                        <div className="space-y-1">
                          {empMobileDevices.map(d => (
                            <div key={d.id} className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70 w-fit">
                              <Smartphone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[140px]" title={d.deviceName}>{d.deviceName}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleQuickToken(m)}
                          className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition"
                          title="Click to generate mobile enrollment QR / token"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>Link Handset</span>
                        </button>
                      )}
                    </td>

                    {/* Column 4: Windows Desktop PC */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {empDesktopDevices.length > 0 ? (
                        <div className="space-y-1">
                          {empDesktopDevices.map(d => (
                            <div key={d.id} className="flex items-center gap-1.5 text-xs font-medium text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/70 w-fit">
                              <Monitor className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate max-w-[130px]" title={d.hostname}>{d.hostname}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                d.currentStatus === 'WORKING' ? 'bg-emerald-100 text-emerald-800' :
                                d.currentStatus === 'ON_BREAK' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {d.currentStatus || 'ACTIVE'}
                              </span>
                            </div>
                          ))}
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Active: {formatHours(m.desktopActiveSeconds)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No PC linked</span>
                      )}
                    </td>

                    {/* Column 5: Synced Calls */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-full">
                        <PhoneCall className="h-3 w-3 text-blue-600" />
                        {(m.totalCalls ?? 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Column 6: Admin Actions */}
                    {canManageEmployees && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyCredentialsQuick(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition"
                            title="Copy WhatsApp / Slack welcome message with credentials"
                          >
                            {copiedShareId === m.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="h-3.5 w-3.5" />
                                <span>Share</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openResetPasswordModal(m)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            title="Reset employee password"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                            <span>Password</span>
                          </button>
                          <button
                            onClick={() => handleQuickToken(m)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition"
                            title="Generate single-use enrollment QR token for Android handset"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(m)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            title="Edit role, team, or employee code"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? `No telecallers match "${searchQuery}"` : 'No telecallers created yet. Click "Add Employee / User" to create one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Employee / Telecaller with User ID & Password */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add Employee / Telecaller Account"
        description="Create credentials for a telecaller. They can use this User ID (or Email) and Password to log into both the Android app and the Windows Desktop agent."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200">
              {inviteError}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => handleFullNameChange(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* User ID & Password in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  User ID / Username <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-indigo-600 font-medium">Used for App Login</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono text-slate-400 text-sm font-bold">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. ramesh01"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Telecaller enters this on phone & PC</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateRandomPassword())}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Generate</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Pass@2026"
                  className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Provide this to the telecaller</p>
            </div>
          </div>

          {/* Email Address & Employee Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`${username || 'user'}@${activeOrg?.slug || 'company'}.local`}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Employee Code <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP-101"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Role & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="EMPLOYEE">EMPLOYEE (Standard Telecaller)</option>
                <option value="MANAGER">MANAGER (Team Supervisor)</option>
                <option value="ORG_ADMIN">ORG_ADMIN (Full Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Team</label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">General Team</option>
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
              disabled={inviteLoading || !fullName.trim() || !username.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>{inviteLoading ? 'Creating User...' : 'Create Telecaller Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Post-Creation Welcome Credentials Card */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Telecaller Account Created Successfully!"
        description="Share these login credentials with your telecaller so they can log into the Android app and Windows Desktop tracker."
      >
        {createdCredentials && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{createdCredentials.fullName}</h4>
                    <p className="text-xs text-emerald-800 font-medium">{createdCredentials.role} • {createdCredentials.orgName}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-sm">
                  {createdCredentials.orgSlug}
                </span>
              </div>

              {/* Credentials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">User ID / Username</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm select-all">
                    {createdCredentials.username}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Password</span>
                  <span className="font-mono font-bold text-slate-900 text-sm select-all">
                    {createdCredentials.password}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 col-span-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                  <span className="font-medium text-slate-700 select-all">
                    {createdCredentials.email}
                  </span>
                </div>
              </div>

              {/* Download Links Info */}
              <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200/60 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Android App APK:</span>
                  <code className="text-[11px] font-mono text-blue-600 select-all">{createdCredentials.apkDownloadUrl}</code>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Laptop className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Windows Desktop:</span>
                  <code className="text-[11px] font-mono text-indigo-600 select-all">{createdCredentials.desktopDownloadUrl}</code>
                </div>
              </div>
            </div>

            {/* 1-Click Copy WhatsApp / Welcome Message Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const msg = buildWelcomeMessage(createdCredentials);
                  navigator.clipboard.writeText(msg);
                  setCopiedWelcomeMsg(true);
                  setTimeout(() => setCopiedWelcomeMsg(false), 2500);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {copiedWelcomeMsg ? (
                  <>
                    <CheckSquare className="h-5 w-5" />
                    <span>Copied WhatsApp Message to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-5 w-5" />
                    <span>Copy WhatsApp / Welcome Message</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 3: Reset Password Modal */}
      <Modal
        isOpen={!!resetModalMember}
        onClose={() => {
          setResetModalMember(null);
          setResetResult(null);
        }}
        title={`Reset Password: ${resetModalMember?.user?.fullName || 'Employee'}`}
        description="Enter a new password or auto-generate one for this telecaller."
      >
        {resetResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Password Reset Successfully!</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                <p><strong>Telecaller:</strong> {resetResult.fullName}</p>
                <p><strong>User ID:</strong> <span className="font-mono font-bold text-indigo-700">@{resetResult.username}</span></p>
                <p><strong>Email:</strong> {resetResult.email}</p>
                <p><strong>New Password:</strong> <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{resetResult.password}</span></p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const msg = buildWelcomeMessage({
                  fullName: resetResult.fullName,
                  username: resetResult.username,
                  email: resetResult.email,
                  password: resetResult.password,
                  orgSlug: activeOrg?.slug,
                  orgName: activeOrg?.name
                });
                navigator.clipboard.writeText(msg);
                setCopiedResetMsg(true);
                setTimeout(() => setCopiedResetMsg(false), 2000);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
            >
              {copiedResetMsg ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedResetMsg ? 'Copied to Clipboard!' : 'Copy WhatsApp Message'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setResetModalMember(null);
                setResetResult(null);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetPasswordVal(generateRandomPassword())}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Generate</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={resetPasswordVal}
                onChange={e => setResetPasswordVal(e.target.value)}
                placeholder="Pass@2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModalMember(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetLoading || !resetPasswordVal.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 4: Edit Employee Role / Team */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={`Edit Employee: ${editingMember?.user?.fullName || ''}`}
        description="Update role permissions, department assignment, or employee code."
      >
        {editSuccess ? (
          <div className="py-6 text-center text-emerald-600 space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto" />
            <p className="font-semibold text-base">Employee Updated Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200">
                {editError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{editingMember?.user?.fullName}</p>
                <p className="text-slate-500 font-mono">@{editingMember?.user?.username || editingMember?.user?.email.split('@')[0]}</p>
              </div>
              <span className="font-mono text-slate-500">{editingMember?.employeeCode || '—'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                  <option value="ORG_OWNER">ORG_OWNER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Team</label>
                <select
                  value={editTeamId}
                  onChange={e => setEditTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">General Team</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Employee Code</label>
              <input
                type="text"
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 5: Quick Enrollment Token Modal */}
      <Modal
        isOpen={!!tokenEmployee}
        onClose={() => setTokenEmployee(null)}
        title={`Enroll Handset for ${tokenEmployee?.user?.fullName || 'Employee'}`}
        description="Share this single-use code with the employee, or have them log in directly with their User ID & Password in the Android app."
      >
        <div className="space-y-4 text-center">
          {tokenLoading ? (
            <p className="py-6 text-sm text-slate-500">Generating token...</p>
          ) : generatedToken ? (
            <>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs uppercase font-bold text-slate-400 mb-2">Single-Use Enrollment Token</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-wider text-blue-600 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                    {generatedToken}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-600"
                  >
                    {copiedToken ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Valid for 48 hours • Links handset directly to {tokenEmployee?.user?.fullName}</p>
              </div>
              <button
                onClick={() => setTokenEmployee(null)}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Done
              </button>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Modal 6: Create Team Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title="Create Department / Telecaller Team"
        description="Group telecallers into teams (e.g. Outbound Sales, Inbound Support, Renewals) for filtered analytics."
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Team Name</label>
            <input
              type="text"
              required
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="e.g. Enterprise Sales"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={newTeamDesc}
              onChange={e => setNewTeamDesc(e.target.value)}
              placeholder="Handles high-value inbound & outbound leads"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={teamLoading || !newTeamName.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {teamLoading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  LogOut,
  Shield,
  Plus,
  Copy,
  Check,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';

export const Navbar: React.FC = () => {
  const {
    user,
    memberships,
    organizations,
    activeOrg,
    activeMembership,
    logout,
    switchOrganization,
    createNewOrganization
  } = useAuth();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Create New Organization Modal
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newOrgLoading, setNewOrgLoading] = useState(false);
  const [newOrgError, setNewOrgError] = useState<string | null>(null);

  const handleCopyOrgCode = () => {
    if (!activeOrg?.slug) return;
    navigator.clipboard.writeText(activeOrg.slug);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setNewOrgLoading(true);
    setNewOrgError(null);
    try {
      await createNewOrganization(newOrgName.trim(), newOrgSlug.trim() || undefined);
      setIsNewOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
    } catch (err: any) {
      setNewOrgError(err.message || 'Failed to create organization');
    } finally {
      setNewOrgLoading(false);
    }
  };

  const orgList =
    organizations.length > 0
      ? organizations
      : memberships.map(m => ({
          id: m.organizationId,
          name: m.organization?.name || (m.organizationId === activeOrg?.id ? activeOrg.name : 'Organization'),
          slug: m.organization?.slug || '',
          role: m.role
        }));

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        {/* Organization Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-800 text-sm font-medium"
          >
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">{activeOrg?.name || 'Select Organization'}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
              <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Switch Organization Tenant</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {orgList.length}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {orgList.map((o: any) => {
                  const mem = memberships.find(m => m.organizationId === o.id);
                  const roleLabel = o.role || mem?.role || (user?.isSuperAdmin ? 'SUPER_ADMIN' : 'MEMBER');
                  const isCurrent = o.id === activeOrg?.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => {
                        switchOrganization(o.id);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition ${
                        isCurrent ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate">{o.name}</p>
                        {o.slug && (
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            Code: {o.slug}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                        {roleLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-1 mt-1 px-1.5">
                <button
                  onClick={() => {
                    setIsOrgDropdownOpen(false);
                    setIsNewOrgModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Organization</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Organization Join Code Pill for Mobile Onboarding */}
        {activeOrg?.slug && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-slate-500 font-medium">App Join Code:</span>
            <code className="font-mono font-bold text-indigo-700">{activeOrg.slug}</code>
            <button
              onClick={handleCopyOrgCode}
              title="Copy Organization Join Code for Android App Registration"
              className="ml-1 p-0.5 text-slate-400 hover:text-indigo-600 transition"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Right controls: Role pill, User profile */}
      <div className="flex items-center gap-4">
        {activeMembership && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            <Shield className="h-3.5 w-3.5 mr-1 text-blue-500" />
            {activeMembership.role}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2.5 pl-2 hover:opacity-90 transition"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900">{user?.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create New Organization Modal */}
      <Modal
        isOpen={isNewOrgModalOpen}
        onClose={() => setIsNewOrgModalOpen(false)}
        title="Create New Organization Tenant"
        description="Provision an isolated multi-tenant workspace with its own employees, Android handsets, leads, and call analytics."
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          {newOrgError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {newOrgError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Company / Organization Name
            </label>
            <input
              type="text"
              required
              value={newOrgName}
              onChange={e => {
                setNewOrgName(e.target.value);
                if (!newOrgSlug) {
                  // Auto-suggest slug preview in placeholder
                }
              }}
              placeholder="e.g. Apex Real Estate Pvt Ltd"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Custom Join Code / Slug (Optional)
            </label>
            <input
              type="text"
              value={newOrgSlug}
              onChange={e => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder={
                newOrgName
                  ? newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  : 'apex-real-estate'
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Telecallers can enter this code in the Android app to register and join this company.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewOrgModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={newOrgLoading || !newOrgName.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {newOrgLoading ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};

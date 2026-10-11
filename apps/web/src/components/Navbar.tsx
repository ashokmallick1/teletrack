import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, memberships, activeOrg, activeMembership, logout, switchOrganization } = useAuth();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
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
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400 border-b border-slate-100">
              Organizations
            </div>
            {memberships.map(m => (
              <button
                key={m.organizationId}
                onClick={() => {
                  switchOrganization(m.organizationId);
                  setIsOrgDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition ${
                  m.organizationId === activeOrg?.id ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-slate-700'
                }`}
              >
                <span>{m.organizationId === activeOrg?.id ? activeOrg.name : `Org (${m.role})`}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                  {m.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right controls: Role pill, Notification, User profile */}
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
    </header>
  );
};

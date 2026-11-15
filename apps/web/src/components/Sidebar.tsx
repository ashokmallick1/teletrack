import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  Smartphone,
  UserCheck,
  BarChart3,
  Monitor,
  Settings,
  ShieldAlert,
  ChevronRight,
  PhoneForwarded,
  Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, activeMembership } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin;
  const isOrgAdmin = activeMembership?.role === 'ORG_OWNER' || activeMembership?.role === 'ORG_ADMIN';

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Power Dialer', path: '/dialer', icon: PhoneForwarded },
    { label: 'Call History', path: '/calls', icon: PhoneCall },
    { label: 'Productivity & Desktop', path: '/productivity', icon: Monitor },
    { label: 'TV Leaderboard', path: '/tv-leaderboard', icon: Trophy },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Devices', path: '/devices', icon: Smartphone },
    { label: 'Leads & CRM', path: '/leads', icon: UserCheck },
    { label: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
    ...(isOrgAdmin ? [{ label: 'Settings', path: '/settings', icon: Settings }] : []),
    ...(isSuperAdmin ? [{ label: 'Super Admin', path: '/super-admin', icon: ShieldAlert }] : [])
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          T
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base">TeleTrack</span>
          <span className="text-xs text-blue-400 font-semibold ml-1.5 px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/60">
            PRO
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Management
        </p>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-blue-200" />}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Sync Status footer in sidebar */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-200">Cloud Sync Active</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Android agents telemetry streaming securely.
        </p>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Building,
  Smartphone,
  PhoneCall,
  Users,
  ArrowRight,
  Plus
} from 'lucide-react';
import { StatCard } from '../components/StatCard';

export const SuperAdmin: React.FC = () => {
  const { client, user, switchOrganization, activeOrg } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [orgs, usg] = await Promise.all([
          client.getAdminOrganizations(),
          client.getAdminUsage()
        ]);
        setOrganizations(orgs);
        setUsage(usg);
      } catch (err) {
        console.error('Failed to load super admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">Platform Super Administrator authorization required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-rose-600 font-semibold text-xs tracking-wider uppercase">
          <ShieldAlert className="h-4 w-4" />
          <span>Platform Super Administration</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Global System Telemetry</h1>
        <p className="text-sm text-slate-500 mt-1">
          Multi-tenant organizations directory, platform quotas and overall system activity
        </p>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Tenant Orgs"
          value={usage?.totalOrganizations ?? 0}
          icon={Building}
          variant="blue"
        />
        <StatCard
          title="Total Users"
          value={usage?.totalUsers ?? 0}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Active Devices"
          value={usage?.totalDevices ?? 0}
          icon={Smartphone}
          variant="emerald"
        />
        <StatCard
          title="Total Call Logs"
          value={usage?.totalCallEvents ?? 0}
          icon={PhoneCall}
          variant="amber"
        />
      </div>

      {/* Organizations Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Tenant Organizations Directory</h2>
          <span className="text-xs text-slate-400">Total {organizations.length} organizations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Organization Name</th>
                <th className="px-6 py-3.5">App Join Code (Slug)</th>
                <th className="px-6 py-3.5">Timezone</th>
                <th className="px-6 py-3.5 text-center">Handsets</th>
                <th className="px-6 py-3.5 text-center">Members</th>
                <th className="px-6 py-3.5 text-center">Total Calls</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {organizations.map(org => (
                <tr key={org.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{org.name}</span>
                      {activeOrg?.id === org.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          Active View
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-indigo-700 font-semibold">
                    {org.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                    {org.timezone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                    {org.deviceCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                    {org.memberCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-blue-600">
                    {org.callCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={async () => {
                        await switchOrganization(org.id);
                        navigate('/');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 transition"
                    >
                      <span>Inspect Tenant</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

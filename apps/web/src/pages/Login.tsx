import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
          <PhoneCall className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">Callyzer Cloud</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise SIM Call Analytics & Telecalling Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700 flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
            >
              {loading ? 'Authenticating...' : 'Sign in to Dashboard'}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Demo Accounts (Password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('owner@acme.com')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-left"
              >
                🏢 Acme Owner
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('rahul@acme.com')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-left"
              >
                📱 Telecaller (Rahul)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('owner@globalconnect.com')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-left"
              >
                🌐 Org B (Isolated)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('superadmin@callyzer.io')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-left"
              >
                🛡️ Super Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            New company?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Create an organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

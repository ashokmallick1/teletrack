import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CallHistory } from './pages/CallHistory';
import { Employees } from './pages/Employees';
import { Devices } from './pages/Devices';
import { Leads } from './pages/Leads';
import { Reports } from './pages/Reports';
import { Productivity } from './pages/Productivity';
import { Settings } from './pages/Settings';
import { SuperAdmin } from './pages/SuperAdmin';
import { PowerDialer } from './pages/PowerDialer';
import { TvLeaderboard } from './pages/TvLeaderboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-blue-500 animate-ping"></span>
          <span className="text-sm font-semibold tracking-wide">Loading TeleTrack Cloud...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dedicated Fullscreen Sales Floor TV Arena */}
          <Route
            path="/tv-leaderboard"
            element={
              <ProtectedRoute>
                <TvLeaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dialer" element={<PowerDialer />} />
            <Route path="calls" element={<CallHistory />} />
            <Route path="employees" element={<Employees />} />
            <Route path="devices" element={<Devices />} />
            <Route path="leads" element={<Leads />} />
            <Route path="reports" element={<Reports />} />
            <Route path="productivity" element={<Productivity />} />
            <Route path="settings" element={<Settings />} />
            <Route path="super-admin" element={<SuperAdmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
export default App;

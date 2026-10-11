import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, OrganizationMembership, Organization } from '@callyzer/shared-types';
import { CallyzerApiClient } from '@callyzer/api-client';

interface AuthContextType {
  user: UserProfile | null;
  memberships: OrganizationMembership[];
  activeOrg: Organization | null;
  activeMembership: OrganizationMembership | null;
  token: string | null;
  client: CallyzerApiClient;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName?: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('callyzer_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('callyzer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [activeMembership, setActiveMembership] = useState<OrganizationMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const client = new CallyzerApiClient({
    baseUrl: '',
    getToken: () => token,
    getOrganizationId: () => activeOrg?.id || null
  });

  const loadUserData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await client.getMe();
      setUser(data.user);
      setMemberships(data.memberships);

      // Load organization info
      const orgs = await client.getOrganizations();
      if (orgs.length > 0) {
        const savedOrgId = localStorage.getItem('callyzer_active_org');
        const selected = orgs.find(o => o.id === savedOrgId) || orgs[0];
        setActiveOrg(selected);
        const mem = data.memberships.find(m => m.organizationId === selected.id) || null;
        setActiveMembership(mem);
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    setMemberships(data.memberships);
    localStorage.setItem('callyzer_token', data.token);
    localStorage.setItem('callyzer_user', JSON.stringify(data.user));

    if (data.memberships.length > 0) {
      const firstOrgId = data.memberships[0].organizationId;
      localStorage.setItem('callyzer_active_org', firstOrgId);
    }
  };

  const register = async (email: string, password: string, fullName: string, orgName?: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, organizationName: orgName })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('callyzer_token', data.token);
    localStorage.setItem('callyzer_user', JSON.stringify(data.user));
    if (data.organization) {
      setActiveOrg(data.organization);
      setActiveMembership(data.membership);
      localStorage.setItem('callyzer_active_org', data.organization.id);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMemberships([]);
    setActiveOrg(null);
    setActiveMembership(null);
    localStorage.removeItem('callyzer_token');
    localStorage.removeItem('callyzer_user');
    localStorage.removeItem('callyzer_active_org');
  };

  const switchOrganization = async (orgId: string) => {
    localStorage.setItem('callyzer_active_org', orgId);
    const orgs = await client.getOrganizations();
    const found = orgs.find(o => o.id === orgId);
    if (found) {
      setActiveOrg(found);
      const mem = memberships.find(m => m.organizationId === orgId) || null;
      setActiveMembership(mem);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeOrg,
        activeMembership,
        token,
        client,
        isLoading,
        login,
        register,
        logout,
        switchOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

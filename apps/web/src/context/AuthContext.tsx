import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, OrganizationMembership, Organization } from '@teletrack/shared-types';
import { TeleTrackApiClient } from '@teletrack/api-client';

interface AuthContextType {
  user: UserProfile | null;
  memberships: OrganizationMembership[];
  organizations: Organization[];
  activeOrg: Organization | null;
  activeMembership: OrganizationMembership | null;
  token: string | null;
  client: TeleTrackApiClient;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName?: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  createNewOrganization: (name: string, slug?: string) => Promise<Organization>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('teletrack_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('teletrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [activeMembership, setActiveMembership] = useState<OrganizationMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const client = new TeleTrackApiClient({
    baseUrl: '',
    getToken: () => token || localStorage.getItem('teletrack_token'),
    getOrganizationId: () => activeOrg?.id || localStorage.getItem('teletrack_active_org') || null
  });

  const loadUserData = async () => {
    const currentToken = token || localStorage.getItem('teletrack_token');
    if (!currentToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await client.getMe();
      setUser(data.user);
      setMemberships(data.memberships);

      // Load organization info
      const orgs = await client.getOrganizations();
      setOrganizations(orgs || []);
      if (orgs && orgs.length > 0) {
        const savedOrgId = localStorage.getItem('teletrack_active_org');
        const selected = orgs.find(o => o.id === savedOrgId) || orgs[0];
        setActiveOrg(selected);
        localStorage.setItem('teletrack_active_org', selected.id);
        const mem =
          data.memberships.find(m => m.organizationId === selected.id) ||
          (data.user.isSuperAdmin
            ? ({
                id: 'super-admin-membership',
                organizationId: selected.id,
                userId: data.user.id,
                role: 'SUPER_ADMIN',
                isActive: true,
                createdAt: selected.createdAt,
                updatedAt: selected.updatedAt
              } as OrganizationMembership)
            : null);
        setActiveMembership(mem);
      }
    } catch (err: any) {
      console.error('Failed to load user info:', err);
      const isAuthError = err?.message?.includes('401') || err?.message?.includes('Unauthorized');
      if (isAuthError) {
        logout();
      }
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
    localStorage.setItem('teletrack_token', data.token);
    localStorage.setItem('teletrack_user', JSON.stringify(data.user));

    if (data.memberships && data.memberships.length > 0) {
      const firstOrgId = data.memberships[0].organizationId;
      localStorage.setItem('teletrack_active_org', firstOrgId);
      setActiveMembership(data.memberships[0]);

      // Eagerly fetch and set active organization
      try {
        const orgsRes = await fetch('/api/v1/organizations', {
          headers: { Authorization: `Bearer ${data.token}` }
        });
        if (orgsRes.ok) {
          const orgs: Organization[] = await orgsRes.json();
          if (orgs.length > 0) {
            const current = orgs.find(o => o.id === firstOrgId) || orgs[0];
            setActiveOrg(current);
            localStorage.setItem('teletrack_active_org', current.id);
          }
        }
      } catch (e) {
        console.warn('Could not eagerly fetch orgs on login:', e);
      }
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
    localStorage.setItem('teletrack_token', data.token);
    localStorage.setItem('teletrack_user', JSON.stringify(data.user));
    if (data.organization) {
      setActiveOrg(data.organization);
      setActiveMembership(data.membership);
      localStorage.setItem('teletrack_active_org', data.organization.id);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMemberships([]);
    setOrganizations([]);
    setActiveOrg(null);
    setActiveMembership(null);
    localStorage.removeItem('teletrack_token');
    localStorage.removeItem('teletrack_user');
    localStorage.removeItem('teletrack_active_org');
  };

  const switchOrganization = async (orgId: string) => {
    localStorage.setItem('teletrack_active_org', orgId);
    const orgs = await client.getOrganizations();
    setOrganizations(orgs || []);
    const found = orgs.find(o => o.id === orgId);
    if (found) {
      setActiveOrg(found);
      const mem =
        memberships.find(m => m.organizationId === orgId) ||
        (user?.isSuperAdmin
          ? ({
              id: 'super-admin-membership',
              organizationId: found.id,
              userId: user.id,
              role: 'SUPER_ADMIN',
              isActive: true,
              createdAt: found.createdAt,
              updatedAt: found.updatedAt
            } as OrganizationMembership)
          : null);
      setActiveMembership(mem);
    }
  };

  const createNewOrganization = async (name: string, slug?: string): Promise<Organization> => {
    const newOrg = await client.createOrganization({ name, slug });
    await loadUserData();
    await switchOrganization(newOrg.id);
    return newOrg;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        organizations,
        activeOrg,
        activeMembership,
        token,
        client,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        createNewOrganization,
        refreshAuthData: loadUserData
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

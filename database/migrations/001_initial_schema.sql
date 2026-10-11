-- Migration: 001_initial_schema.sql
-- Description: Core schema for Multi-Tenant Call Analytics & Telecalling SaaS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES (Users matching Supabase Auth or Local Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    password_hash TEXT, -- Used for self-hosted / local JWT authentication
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. ORGANIZATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    retention_days INT NOT NULL DEFAULT 90,
    mask_phone_numbers BOOLEAN NOT NULL DEFAULT FALSE,
    max_devices INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TEAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_org_name UNIQUE (organization_id, name)
);

-- ============================================================================
-- 4. ORGANIZATION MEMBERSHIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ORG_OWNER', 'ORG_ADMIN', 'MANAGER', 'EMPLOYEE')),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    employee_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    invited_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_membership UNIQUE (organization_id, user_id)
);

-- ============================================================================
-- 5. DEVICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    device_identifier TEXT NOT NULL,
    device_name TEXT NOT NULL,
    model TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    os_version TEXT NOT NULL,
    app_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_ENROLLMENT', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
    last_contact_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
    sim_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_org_identifier UNIQUE (organization_id, device_identifier)
);

-- ============================================================================
-- 6. DEVICE SESSIONS / API KEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    api_key_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. ENROLLMENT TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. SYNC BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    received_count INT NOT NULL DEFAULT 0,
    inserted_count INT NOT NULL DEFAULT 0,
    duplicate_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. LEADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_employee_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST')),
    source TEXT DEFAULT 'MANUAL',
    follow_up_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    notes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lead_org_phone UNIQUE (organization_id, phone_number)
);

-- ============================================================================
-- 10. CALL EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    source_call_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING', 'MISSED', 'REJECTED', 'UNKNOWN')),
    duration_seconds INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    outcome TEXT NOT NULL CHECK (outcome IN ('ANSWERED', 'MISSED', 'REJECTED', 'BUSY', 'FAILED', 'UNKNOWN')),
    outcome_confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    raw_phone_number TEXT NOT NULL,
    sim_slot INT,
    sim_carrier TEXT,
    phone_account TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    data_source TEXT NOT NULL CHECK (data_source IN ('NATIVE_CALL_LOG', 'MANUAL_ENTRY', 'CSV_IMPORT', 'TELEPHONY_API')),
    sync_batch_id UUID REFERENCES sync_batches(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_org_device_source UNIQUE (organization_id, device_id, source_call_id)
);

-- ============================================================================
-- 11. LEAD NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. FOLLOW UPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_employee_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 14. SUBSCRIPTION PLANS & BILLING
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    max_devices INT NOT NULL,
    max_employees INT NOT NULL,
    retention_days INT NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'TRIALING' CHECK (status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    current_value INT NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usage_org_metric_period UNIQUE (organization_id, metric_name, period_start)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE & QUERY ACCELERATION
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_call_events_org_started ON call_events(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_events_org_employee ON call_events(organization_id, employee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_events_org_direction ON call_events(organization_id, direction);
CREATE INDEX IF NOT EXISTS idx_call_events_org_outcome ON call_events(organization_id, outcome);
CREATE INDEX IF NOT EXISTS idx_call_events_lead ON call_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_phone ON leads(organization_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_org_employee ON leads(organization_id, assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON organization_memberships(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION user_in_org(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = org_id
      AND user_id = current_user_id()
      AND is_active = TRUE
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION user_role_in_org(org_id UUID) RETURNS TEXT AS $$
  SELECT role FROM organization_memberships
  WHERE organization_id = org_id
    AND user_id = current_user_id()
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Organizations policy
CREATE POLICY org_access ON organizations
  FOR ALL
  USING (
    user_in_org(id) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Teams policy
CREATE POLICY teams_access ON teams
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Memberships policy
CREATE POLICY memberships_access ON organization_memberships
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    user_id = current_user_id() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Devices policy
CREATE POLICY devices_access ON devices
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Call events policy
CREATE POLICY call_events_access ON call_events
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Leads policy
CREATE POLICY leads_access ON leads
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Lead notes policy
CREATE POLICY lead_notes_access ON lead_notes
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Follow ups policy
CREATE POLICY follow_ups_access ON follow_ups
  FOR ALL
  USING (
    user_in_org(organization_id) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

-- Audit logs policy
CREATE POLICY audit_logs_access ON audit_logs
  FOR ALL
  USING (
    (user_in_org(organization_id) AND user_role_in_org(organization_id) IN ('ORG_OWNER', 'ORG_ADMIN')) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id() AND is_super_admin = TRUE)
  );

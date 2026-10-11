-- Seed data for Callyzer Platform
-- Demonstrates multi-tenancy, role hierarchy, leads, devices, and realistic call analytics

-- 1. Subscription Plans
INSERT INTO subscription_plans (id, name, code, max_devices, max_employees, retention_days, price_monthly, features)
VALUES 
  ('11111111-1111-1111-1111-111111111101', 'Starter', 'STARTER', 5, 5, 30, 29.00, '["basic_analytics", "device_management", "csv_export"]'::jsonb),
  ('11111111-1111-1111-1111-111111111102', 'Professional', 'PRO', 25, 30, 90, 99.00, '["advanced_analytics", "lead_management", "realtime_sync", "csv_import_export", "audit_logs"]'::jsonb),
  ('11111111-1111-1111-1111-111111111103', 'Enterprise', 'ENTERPRISE', 200, 250, 365, 399.00, '["unlimited_analytics", "lead_management", "custom_reports", "role_hierarchy", "dedicated_support", "api_access"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. Profiles (Password: 'Password123!' hashed with bcrypt or demo SHA/bcrypt)
-- Hash for 'Password123!' -> $2b$10$wT0l0hXvXq3z9Zk9P3pDguCq2Yk3Qo5xGq2J1F7K9xXq3z9Zk9P3p (or placeholder evaluated by server)
INSERT INTO profiles (id, email, full_name, is_super_admin, password_hash)
VALUES
  ('22222222-2222-2222-2222-222222222200', 'superadmin@callyzer.io', 'Platform Super Admin', TRUE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('22222222-2222-2222-2222-222222222201', 'owner@acme.com', 'Rajesh Sharma (Owner)', FALSE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('22222222-2222-2222-2222-222222222202', 'manager@acme.com', 'Priya Patel (Sales Manager)', FALSE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('22222222-2222-2222-2222-222222222203', 'rahul@acme.com', 'Rahul Verma (Telecaller 1)', FALSE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('22222222-2222-2222-2222-222222222204', 'sneha@acme.com', 'Sneha Rao (Telecaller 2)', FALSE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('22222222-2222-2222-2222-222222222205', 'owner@globalconnect.com', 'David Miller (Org B Owner)', FALSE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (email) DO NOTHING;

-- 3. Organizations
INSERT INTO organizations (id, name, slug, timezone, retention_days, mask_phone_numbers, max_devices)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'Acme TeleServices Pvt Ltd', 'acme-teleservices', 'Asia/Kolkata', 90, FALSE, 25),
  ('33333333-3333-3333-3333-333333333302', 'Global Connect Logistics', 'global-connect', 'America/New_York', 60, TRUE, 10)
ON CONFLICT (slug) DO NOTHING;

-- 4. Subscriptions
INSERT INTO organization_subscriptions (id, organization_id, plan_id, status, current_period_start, current_period_end)
VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111102', 'ACTIVE', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'TRIALING', NOW() - INTERVAL '3 days', NOW() + INTERVAL '11 days')
ON CONFLICT DO NOTHING;

-- 5. Teams
INSERT INTO teams (id, organization_id, name, description)
VALUES
  ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333301', 'Outbound Sales', 'Cold outreach and qualified sales follow-ups'),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333301', 'Inbound Support', 'Customer queries and retention calls'),
  ('55555555-5555-5555-5555-555555555503', '33333333-3333-3333-3333-333333333302', 'Field Operations', 'Logistics coordination')
ON CONFLICT DO NOTHING;

-- 6. Memberships
INSERT INTO organization_memberships (id, organization_id, user_id, role, team_id, employee_code, is_active)
VALUES
  ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'ORG_OWNER', NULL, 'EMP-001', TRUE),
  ('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202', 'MANAGER', '55555555-5555-5555-5555-555555555501', 'EMP-002', TRUE),
  ('66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', 'EMPLOYEE', '55555555-5555-5555-5555-555555555501', 'EMP-003', TRUE),
  ('66666666-6666-6666-6666-666666666604', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', 'EMPLOYEE', '55555555-5555-5555-5555-555555555502', 'EMP-004', TRUE),
  ('66666666-6666-6666-6666-666666666605', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222205', 'ORG_OWNER', '55555555-5555-5555-5555-555555555503', 'GC-001', TRUE)
ON CONFLICT DO NOTHING;

-- 7. Devices
INSERT INTO devices (id, organization_id, employee_id, device_identifier, device_name, model, manufacturer, os_version, app_version, status, last_contact_at, last_sync_at, permission_granted, sim_metadata)
VALUES
  ('77777777-7777-7777-7777-777777777701', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666603', 'device-android-rahul-01', 'Samsung Galaxy M34 (Rahul)', 'SM-M346B', 'Samsung', 'Android 14 (API 34)', '1.0.0', 'ACTIVE', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', TRUE, '{"carrierName": "Jio 5G", "simCount": 2, "phoneAccountHandle": "sim_0"}'::jsonb),
  ('77777777-7777-7777-7777-777777777702', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666604', 'device-android-sneha-02', 'Redmi Note 13 Pro (Sneha)', '2312DRA50G', 'Xiaomi', 'Android 14 (API 34)', '1.0.0', 'ACTIVE', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', TRUE, '{"carrierName": "Airtel", "simCount": 1, "phoneAccountHandle": "sim_0"}'::jsonb),
  ('77777777-7777-7777-7777-777777777703', '33333333-3333-3333-3333-333333333302', '66666666-6666-6666-6666-666666666605', 'device-android-david-01', 'Pixel 8 Pro (David)', 'Pixel 8 Pro', 'Google', 'Android 15 (API 35)', '1.0.0', 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', TRUE, '{"carrierName": "Verizon", "simCount": 1, "phoneAccountHandle": "sim_0"}'::jsonb)
ON CONFLICT DO NOTHING;

-- 8. Device Session / API Key for rahul-01
-- Hash of 'dev_api_key_rahul_demo_12345678'
INSERT INTO device_sessions (id, device_id, api_key_hash, expires_at)
VALUES
  ('88888888-8888-8888-8888-888888888801', '77777777-7777-7777-7777-777777777701', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', NOW() + INTERVAL '365 days')
ON CONFLICT DO NOTHING;

-- 9. Leads
INSERT INTO leads (id, organization_id, assigned_employee_id, name, phone_number, email, company, status, source, follow_up_at, last_contacted_at, notes_count)
VALUES
  ('99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666603', 'Anand Kulkarni', '+919822011223', 'anand@techcraft.in', 'Techcraft Solutions', 'QUALIFIED', 'Website', NOW() + INTERVAL '1 day', NOW() - INTERVAL '2 hours', 2),
  ('99999999-9999-9999-9999-999999999902', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666603', 'Meera Singhania', '+919876543210', 'meera@singhania.com', 'Singhania Exports', 'CONTACTED', 'Cold Call', NOW() + INTERVAL '2 days', NOW() - INTERVAL '5 hours', 1),
  ('99999999-9999-9999-9999-999999999903', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666604', 'Vikram Seth', '+919811122233', 'vikram@sethenterprises.in', 'Seth Enterprises', 'NEW', 'Referral', NOW() + INTERVAL '4 hours', NULL, 0),
  ('99999999-9999-9999-9999-999999999904', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666604', 'Sunita Reddy', '+919944556677', 'sunita@reddypharma.com', 'Reddy Pharma Ltd', 'WON', 'Inbound Lead', NULL, NOW() - INTERVAL '1 day', 3)
ON CONFLICT DO NOTHING;

-- 10. Lead Notes
INSERT INTO lead_notes (id, lead_id, organization_id, author_id, note, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', 'Spoke regarding 50 user package. Requested quote breakdown.', NOW() - INTERVAL '2 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', 'Sent demo presentation. Scheduled follow-up call tomorrow.', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- 11. Follow Ups
INSERT INTO follow_ups (id, lead_id, organization_id, assigned_employee_id, scheduled_at, title, notes, is_completed)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666603', NOW() + INTERVAL '1 day', 'Follow up on Enterprise Proposal', 'Discuss discount tier for 50 licenses', FALSE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '99999999-9999-9999-9999-999999999903', '33333333-3333-3333-3333-333333333301', '66666666-6666-6666-6666-666666666604', NOW() + INTERVAL '4 hours', 'Initial qualification call', 'Check current call tracking tool and pain points', FALSE)
ON CONFLICT DO NOTHING;

-- 12. Call Events (Synthetic, realistic telemetry from Android CallLog)
INSERT INTO call_events (id, organization_id, device_id, employee_id, source_call_id, direction, duration_seconds, started_at, ended_at, outcome, outcome_confidence, raw_phone_number, sim_slot, sim_carrier, phone_account, lead_id, data_source)
VALUES
  -- Event 1: Outgoing answered to Lead Anand
  ('cccccccc-cccc-cccc-cccc-cccccccc0001', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'call_log_1001', 'OUTGOING', 245, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '245 seconds', 'ANSWERED', 1.0, '+919822011223', 0, 'Jio 5G', 'sim_0', '99999999-9999-9999-9999-999999999901', 'NATIVE_CALL_LOG'),
  
  -- Event 2: Incoming missed call from Meera
  ('cccccccc-cccc-cccc-cccc-cccccccc0002', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'call_log_1002', 'MISSED', 0, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', 'MISSED', 1.0, '+919876543210', 0, 'Jio 5G', 'sim_0', '99999999-9999-9999-9999-999999999902', 'NATIVE_CALL_LOG'),
  
  -- Event 3: Outgoing rejected by client
  ('cccccccc-cccc-cccc-cccc-cccccccc0003', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'call_log_1003', 'OUTGOING', 0, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', 'REJECTED', 0.9, '+919899001122', 0, 'Jio 5G', 'sim_0', NULL, 'NATIVE_CALL_LOG'),

  -- Event 4: Incoming answered by Sneha
  ('cccccccc-cccc-cccc-cccc-cccccccc0004', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666604', 'call_log_2001', 'INCOMING', 380, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '380 seconds', 'ANSWERED', 1.0, '+919944556677', 0, 'Airtel', 'sim_0', '99999999-9999-9999-9999-999999999904', 'NATIVE_CALL_LOG'),

  -- Event 5: Outgoing connected
  ('cccccccc-cccc-cccc-cccc-cccccccc0005', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666604', 'call_log_2002', 'OUTGOING', 122, NOW() - INTERVAL '1 day' - INTERVAL '2 hours', NOW() - INTERVAL '1 day' - INTERVAL '2 hours' + INTERVAL '122 seconds', 'ANSWERED', 1.0, '+919811122233', 0, 'Airtel', 'sim_0', '99999999-9999-9999-9999-999999999903', 'NATIVE_CALL_LOG'),

  -- Event 6: Outgoing busy
  ('cccccccc-cccc-cccc-cccc-cccccccc0006', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'call_log_1004', 'OUTGOING', 0, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'BUSY', 0.95, '+919123456789', 0, 'Jio 5G', 'sim_0', NULL, 'NATIVE_CALL_LOG'),

  -- Event 7: Outgoing answered long call
  ('cccccccc-cccc-cccc-cccc-cccccccc0007', '33333333-3333-3333-3333-333333333301', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'call_log_1005', 'OUTGOING', 560, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '560 seconds', 'ANSWERED', 1.0, '+919822011223', 0, 'Jio 5G', 'sim_0', '99999999-9999-9999-9999-999999999901', 'NATIVE_CALL_LOG')
ON CONFLICT DO NOTHING;

-- 13. Audit Log
INSERT INTO audit_logs (id, organization_id, actor_id, action, resource_type, resource_id, details)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'ORG_INITIALIZED', 'organizations', '33333333-3333-3333-3333-333333333301', '{"plan": "Professional", "retentionDays": 90}'::jsonb),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'DEVICE_ENROLLED', 'devices', '77777777-7777-7777-7777-777777777701', '{"deviceName": "Samsung Galaxy M34 (Rahul)", "employeeId": "66666666-6666-6666-6666-666666666603"}'::jsonb)
ON CONFLICT DO NOTHING;

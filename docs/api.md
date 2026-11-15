# TeleTrack REST API Documentation (v1)

## 1. Authentication & Base URL

- **Base URL**: `http://localhost:4000/api/v1` (Development)
- **User Authentication**: Passed via standard HTTP header:
  ```http
  Authorization: Bearer <user_jwt_token>
  ```
- **Device Authentication**: Passed via dedicated device header:
  ```http
  x-device-api-key: dev_<64_char_hex_key>
  ```
- **Organization Scoping**:
  ```http
  x-organization-id: <organization_uuid>
  ```

---

## 2. API Endpoints

### 2.1 Authentication & Profile
- `POST /api/v1/auth/login`: Authenticate with email & password. Returns JWT token, profile, and organization memberships.
- `POST /api/v1/auth/register`: Create user account and optional initial organization.
- `GET /api/v1/auth/me`: Retrieve current profile and associated memberships.

### 2.2 Organizations
- `GET /api/v1/organizations`: List organizations current user belongs to.
- `POST /api/v1/organizations`: Create new tenant organization.
- `GET /api/v1/organizations/:orgId`: Retrieve organization metadata and settings.
- `PATCH /api/v1/organizations/:orgId`: Update settings (timezone, phone masking, retention policy).
- `GET /api/v1/organizations/:orgId/members`: List active memberships and roles.

### 2.3 Employees & Teams
- `GET /api/v1/employees`: List employees in the active organization.
- `POST /api/v1/employees/invitations`: Invite an employee by email, assign role and team.
- `GET /api/v1/teams`: List organization teams.
- `POST /api/v1/teams`: Create new team (e.g., "Outbound Sales").

### 2.4 Device Management
- `POST /api/v1/devices/enrollment-token`: Generate short-lived single-use enrollment token and QR payload for an employee.
- `POST /api/v1/devices/enroll`: Called by Android agent with enrollment token and device metadata. Returns `deviceApiKey`.
- `GET /api/v1/devices`: List all enrolled handsets and their sync health.
- `GET /api/v1/devices/:deviceId/status`: Check device status.
- `POST /api/v1/devices/:deviceId/revoke`: Revoke device credentials immediately.

### 2.5 Call Events & Ingestion
- `POST /api/v1/call-events/batch`:
  **Batch Upload from Android Agent or Manual Entry**
  ```json
  {
    "clientTimestamp": "2026-10-11T12:00:00.000Z",
    "events": [
      {
        "sourceCallId": "call_log_1001",
        "direction": "OUTGOING",
        "durationSeconds": 245,
        "startedAt": "2026-10-11T11:55:00.000Z",
        "outcome": "ANSWERED",
        "phoneNumber": "+919822011223",
        "simCarrier": "Jio 5G",
        "dataSource": "NATIVE_CALL_LOG"
      }
    ]
  }
  ```
  **Response**:
  ```json
  {
    "batchId": "uuid",
    "totalReceived": 1,
    "inserted": 1,
    "duplicates": 0,
    "errors": 0,
    "serverTimestamp": "2026-10-11T12:00:01.000Z"
  }
  ```
- `GET /api/v1/call-events`: Query paginated call events with filters (`employeeId`, `teamId`, `direction`, `outcome`, `startDate`, `endDate`, `search`).
- `GET /api/v1/call-events/:eventId`: View details of a single call record.
- `GET /api/v1/call-events/export/csv`: Stream filtered call logs in CSV format.

### 2.6 Analytics
- `GET /api/v1/analytics/overview`: Overall KPIs (Total calls, incoming, outgoing, answered, missed, duration, average duration).
- `GET /api/v1/analytics/calls`: Daily volume trends over time.
- `GET /api/v1/analytics/employees`: Employee-wise productivity breakdown.
- `GET /api/v1/analytics/sync-health`: Fleet device synchronization health states.

### 2.7 Leads & CRM
- `GET /api/v1/leads`: Paginated lead list.
- `POST /api/v1/leads`: Create new lead.
- `PATCH /api/v1/leads/:leadId`: Update lead status or telecaller assignment.
- `POST /api/v1/leads/:leadId/notes`: Add interaction note to lead thread.
- `GET /api/v1/leads/:leadId/notes`: Retrieve notes for a lead.
- `POST /api/v1/leads/import`: Bulk CSV import of leads.
- `GET /api/v1/follow-ups`: Retrieve pending follow-up tasks.

### 2.8 Audit Logs & Super Admin
- `GET /api/v1/audit-logs`: Paginated audit log trail (requires `ORG_OWNER` or `ORG_ADMIN`).
- `GET /api/v1/admin/organizations`: Global directory of organizations (requires `SUPER_ADMIN`).
- `GET /api/v1/admin/usage`: Global platform usage statistics.

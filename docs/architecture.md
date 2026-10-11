# Callyzer SaaS System Architecture

## 1. System Overview

Callyzer is an enterprise multi-tenant call analytics and telecalling management SaaS platform. It enables organizations to monitor, analyze, and optimize employee call activities conducted via normal native SIM cards on Android smartphones without altering the user dialer experience.

```
       +------------------------------------+
       |   Corporate Web App (React/Vite)   |
       |  Admin, Management, Analytics, CRM |
       +-----------------+------------------+
                         | HTTPS (User JWT)
                         v
       +------------------------------------+
       |       Node.js REST API (v1)        |
       |     Express + Zod + Multi-Tenant   |
       +-----------------+------------------+
                         |
       +-----------------+------------------+
       |                                    |
       v                                    v
+--------------+                   +------------------+
|  PostgreSQL  |                   |  Android Agent   |
|  RLS + Schema|                   |  Room + Worker   |
+--------------+                   +------------------+
                                            ^
                                            | Native ContentProvider
                                   +------------------+
                                   | Android CallLog  |
                                   | Native SIM Dialer|
                                   +------------------+
```

---

## 2. Core Subsystems

### 2.1 Web Application (`apps/web`)
- **Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **Role-Based Routing**: Strict access control for `ORG_OWNER`, `ORG_ADMIN`, `MANAGER`, `EMPLOYEE`, and `SUPER_ADMIN`.
- **Dashboards**: Real-time KPI cards, daily volume trend charts, call outcome distribution, employee leaderboards, and device sync health monitors.
- **Call History**: Searchable, paginated telematics table supporting dynamic phone number masking (`+9198****1223`) for data privacy.
- **Lead CRM**: Lead status tracking, CSV import, interaction note threads, and automatic linkage to verified call events.

### 2.2 Native Android Application (`apps/android`)
- **Technology Stack**: Kotlin, Jetpack Compose, Material 3, Room, WorkManager, Retrofit, Coroutines.
- **Normal SIM Call Operation**: Telecallers continue making calls through the phone's native dialer (Google Phone, Samsung Phone, Xiaomi Phone).
- **Modular Data Source**:
  - `AuthorizedCallLogDataSource`: Queries `CallLog.Calls` ContentProvider when authorized.
  - `ManualCallDataSource`: Fallback UI allowing telecallers to log calls when permissions are restricted.
- **Offline Resiliency**:
  - `QueuedCallEventEntity` persisted in Room database.
  - `CallSyncWorker` running under WorkManager with `CONNECTED` network constraints and exponential backoff.
  - Server acknowledgement required before marking items as synced.

### 2.3 Backend API Service (`services/api`)
- **Technology Stack**: Node.js, Express, TypeScript, Zod, JWT, bcrypt.
- **Versioned Endpoints**: Explicit `/api/v1/...` namespace.
- **Device-Scoped Security**: Android devices authenticate via high-entropy `x-device-api-key` tokens. Devices are restricted exclusively to their assigned employee and tenant organization, preventing access to admin routes.
- **Deduplication Engine**: Composite uniqueness enforced across `(organization_id, device_id, source_call_id)` to ensure repeated batch uploads do not distort metrics.
- **Lead Matching**: Incoming/outgoing call telephone numbers automatically correlate with existing organization leads, updating interaction dates and cumulative talk time.

### 2.4 Database & Multi-Tenancy (`database/`)
- **PostgreSQL & Row Level Security (RLS)**:
  - Every tenant entity links to `organization_id`.
  - Postgres RLS policies verify tenant membership on every operation.
  - Indexes on `(organization_id, started_at)` and `(organization_id, employee_id, started_at)` ensure low-latency dashboard queries at scale.

---

## 3. Data Flow & Synchronization Lifecycle

```
[Phone Native Dialer]
         │ (Call Ends)
         ▼
[Android CallLog.Calls Provider]
         │ (Poll via AuthorizedCallLogDataSource)
         ▼
[Room Database: queued_call_events (status: PENDING)]
         │
         ▼
[WorkManager: CallSyncWorker] ──(Checks Network & Battery)
         │
         ▼ (HTTP POST /api/v1/call-events/batch)
[Backend API Ingestion Router]
         ├── 1. Verify Device API Key & Organization
         ├── 2. Check Composite Uniqueness (Deduplication)
         ├── 3. Correlate Phone Numbers with Leads
         ├── 4. Record Sync Batch History
         └── 5. Return Acknowledgement { batchId, inserted, duplicates }
         │
         ▼ (HTTP 200 OK)
[Room Database: Mark status as SYNCED]
```

---

## 4. Failure Modes & Edge Case Handling

1. **Network Disconnection**: Events accumulate safely in the local Room database (`queued_call_events`). Once network is restored, WorkManager executes batch synchronization.
2. **Device Reboot**: WorkManager jobs persist across device reboots and resume execution automatically.
3. **App Force-Close / Process Death**: Background synchronization is handled by the system WorkManager daemon, independent of UI Activity lifecycle.
4. **Duplicate Events in CallLog**: Android system call logs sometimes re-issue IDs or update call durations after completion. The backend uses deterministic composite hashing to prevent duplicate rows.
5. **Private / Restricted Numbers**: Handled without crashing; stored with special identifiers (`PRIVATE_NUMBER` or `UNKNOWN_NUMBER`) and excluded from outbound CRM matching.

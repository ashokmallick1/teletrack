# Callyzer Platform — Enterprise SIM Call Analytics SaaS

A production-grade, multi-tenant call analytics and telecalling management SaaS platform inspired by Callyzer. The system monitors employee call activity from normal SIM-based calls made via Android smartphones using the native phone dialer, without replacing the dialer or capturing microphone audio.

---

## 1. System Architecture

The platform consists of:
1. **Web Application (`apps/web`)**: A responsive SaaS portal for company owners, managers, and platform super administrators (React, TypeScript, Vite, Tailwind CSS, Recharts).
2. **Native Android Application (`apps/android`)**: A background telematics agent that collects SIM call logs via authorized Android APIs and queues them locally for reliable batch synchronization (Kotlin, Jetpack Compose, Room, WorkManager, Retrofit).
3. **Backend REST API (`services/api`)**: Node.js/TypeScript REST API with Zod validation, rate limiting, structured logging, and multi-tenant isolation.
4. **Database & Migrations (`database/`)**: PostgreSQL schema with Row Level Security (RLS) policies, indexes, and comprehensive seed data.
5. **Shared Packages (`packages/`)**: `@callyzer/shared-types` (domain entities) and `@callyzer/api-client` (typed API client).

```
callyzer/
├── apps/
│   ├── web/                     # React + Vite SaaS Dashboard
│   └── android/                 # Kotlin + Jetpack Compose Native App
├── services/
│   └── api/                     # Node.js + Express REST API (v1)
├── packages/
│   ├── shared-types/            # TypeScript interfaces & DTO contracts
│   └── api-client/              # Typed SDK for REST API
├── database/
│   ├── migrations/              # 001_initial_schema.sql (Postgres + RLS)
│   └── seed/                    # seed.sql (demo tenants, users, leads, calls)
├── docs/                        # Architecture, Android permissions, API, deployment
├── docker-compose.yml           # PostgreSQL + API container orchestration
├── .env.example                 # Environment template
└── README.md
```

---

## 2. Key Features

### Web Application
- **Executive Dashboard**: Real-time KPIs (Total, Answered, Missed, Rejected, Talk Time, Average Duration), Daily volume trend charts (Area/Bar), and Outcome distribution (Pie).
- **Call History & Telematics**: Searchable, paginated call records with filtering (Direction, Outcome, Date Range, Telecaller), CSV export, and optional phone number masking (`+9198****1223`) for customer data privacy.
- **Fleet Device Management**: Monitor handset hardware, agent version, permission status, and sync health (`HEALTHY`, `WARNING`, `CRITICAL`). Single-click enrollment token & QR generation.
- **Employee & Team Management**: Team allocations, role hierarchy (`ORG_OWNER`, `ORG_ADMIN`, `MANAGER`, `EMPLOYEE`), and invitation workflows.
- **Lead CRM Integration**: Track sales leads, schedule follow-ups, maintain customer interaction note threads, and automatically correlate incoming/outgoing calls to existing leads.
- **Reports**: Telecaller productivity comparisons, answer rate percentages, connected talk time rankings, and CSV export.
- **Platform Super Admin**: Universal multi-tenant directory, global usage counters, and platform health telemetry.

### Native Android Agent
- **Normal SIM Call Operation**: Telecallers continue using their standard native dialer and SIM card.
- **Modular Data Source Architecture**:
  - `AuthorizedCallLogDataSource`: Automatically reads `CallLog.Calls` ContentProvider when permissions are granted in authorized enterprise environments.
  - `ManualCallDataSource`: Fallback UI enabling telecallers to log calls manually when permissions cannot be granted.
  - `CsvImportDataSource`: Bulk import fallback.
- **Offline Reliability**: Local SQLite persistence via Room (`queued_call_events`) and background synchronization via WorkManager (`CallSyncWorker`) with network constraints and exponential backoff.
- **No Covert Collection**: Does not use accessibility services, hidden reflection APIs, or covert surveillance. **Never records audio or captures the microphone.**

---

## 3. Quickstart & Local Execution

### 3.1 Install Monorepo Dependencies
```bash
npm install
```

### 3.2 Build Shared Packages
```bash
npm run build --workspace=@callyzer/shared-types
npm run build --workspace=@callyzer/api-client
```

### 3.3 Run Backend API
```bash
npm run dev --workspace=services/api
```
The API starts at `http://localhost:4000` with health check at `http://localhost:4000/api/v1/health`.
*(Note: If `DATABASE_URL` is omitted, the API runs using a rich in-memory database with pre-seeded organizations, leads, devices, and call events).*

### 3.4 Run Web Dashboard
In a new terminal:
```bash
npm run dev --workspace=apps/web
```
Open `http://localhost:3000` in your browser.

#### Demo Accounts (Password: `Password123!`):
- **Organization Owner**: `owner@acme.com`
- **Sales Manager**: `manager@acme.com`
- **Telecaller (Rahul)**: `rahul@acme.com`
- **Isolated Org B Owner**: `owner@globalconnect.com`
- **Platform Super Admin**: `superadmin@callyzer.io`

---

## 4. Building & Running the Android App

### 4.1 Prerequisites
- Android SDK installed (`platforms/android-35`, `build-tools/35.0.0`)
- JDK 17 or JDK 21

### 4.2 Compile & Run Unit Tests
```bash
cd apps/android
./gradlew test
```

### 4.3 Assemble Debug APK
```bash
cd apps/android
./gradlew assembleDebug
```
The APK is generated at `apps/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 5. Verification & Test Suite Results

Run all test suites across the monorepo:

```bash
# Run Backend API tests (16 tests)
npm run test --workspace=services/api

# Run Web Frontend tests (3 tests)
npm run test --workspace=apps/web

# Run Android tests
cd apps/android && ./gradlew test
```

---

## 6. Documentation Index

- [System Architecture](docs/architecture.md)
- [Android Call-Log Permissions & Google Play Policy](docs/android-permissions.md)
- [REST API Reference](docs/api.md)
- [Database Schema & Migrations](docs/database.md)
- [Deployment & DevOps](docs/deployment.md)
- [Security & Threat Model](docs/security.md)
- [Employee & Customer Privacy](docs/privacy.md)
- [Testing & Quality Assurance](docs/testing.md)

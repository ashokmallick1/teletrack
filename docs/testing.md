# Quality Assurance & Testing Guide

## 1. Automated Test Suites

The repository contains automated tests across all tiers:

```
├── services/api/test/api.test.ts (16 integration & unit tests)
├── apps/web/test/web.test.ts (3 web unit tests)
└── apps/android/app/src/test/ (Android local JVM tests)
```

---

## 2. Test Execution Commands

### 2.1 Backend API Tests
```bash
npm run test --workspace=services/api
```
**Coverage**:
- Authentication, invalid login rejection, JWT decoding.
- Multi-tenant boundary isolation (cross-tenant access denial).
- Device enrollment token generation & redemption.
- Batch call event ingestion & composite deduplication.
- Automatic correlation of incoming/outgoing calls to leads.
- Analytics calculations (daily trends, KPI aggregates, sync health).
- CSV export integrity.
- Lead notes and follow-up tasks.

### 2.2 Web Application Tests
```bash
npm run test --workspace=apps/web
```
**Coverage**:
- Duration calculation math & formatting.
- Phone number masking logic.
- Telecaller answer rate calculations.

### 2.3 Android Local Tests
```bash
cd apps/android
./gradlew test
```
**Coverage**:
- `CallDataSourceTest`: Verifies capabilities and runtime permission declarations for `AuthorizedCallLogDataSource` and `ManualCallDataSource`.
- `RoomPersistenceTest`: Validates Room entity mapping, sync status transitions, and data integrity.

---

## 3. Real-Device Validation Checklist

When deploying to real Android hardware, execute the following manual test protocol:

1. **Permission Grant**:
   Install APK > Launch app > Tap "Grant Permission" > Verify system dialog appears > Tap "Allow" > Verify status changes to "Automated Call Telemetry Active".
2. **Make Outgoing Call**:
   Open normal native phone dialer > Call a test number > Speak for 15 seconds > Hang up > Open Callyzer Agent > Tap "Sync Now" > Confirm call appears in "Recent Activity Stream".
3. **Verify Dashboard**:
   Open Web Dashboard > Verify event appears in Call History and Dashboard KPIs increment.
4. **Offline Resilience**:
   Enable Airplane mode > Make a test call > Open Callyzer Agent > Confirm call is queued with status `PENDING` > Turn off Airplane mode > Confirm background upload succeeds and transitions to `SYNCED`.

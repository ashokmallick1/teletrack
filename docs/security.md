# Security Architecture & Threat Model

## 1. Threat Model & Security Principles

The TeleTrack platform handles business telephony metadata, employee call statistics, and customer phone numbers. Security is engineered at every layer.

---

## 2. Token Separation: User JWT vs. Device API Keys

### 2.1 Web User JWT Tokens
- Issued upon successful email/password authentication or SSO.
- Scoped to the user's identity and organizational memberships.
- Used exclusively for web management portals, reporting, and settings.

### 2.2 Device-Scoped API Keys
- Handset applications never hold user passwords or master organization keys.
- During enrollment, an administrator generates a short-lived, single-use enrollment token (`ENROLL-XXXXXX`).
- The Android agent redeems this token to receive a 64-character high-entropy device API key (`dev_...`).
- The backend stores only the SHA-256 hash of this key.
- **Strict Scope Constraint**: A device API key is constrained solely to `POST /api/v1/call-events/batch` for its own device ID and assigned employee ID. It cannot read other employees' calls, alter organization settings, or access admin routes.

---

## 3. Defense-in-Depth Multi-Tenancy

1. **Header Validation**: `x-organization-id` header is verified against server-side membership records on every request.
2. **Server-Side Authorization Middleware**: Roles (`ORG_OWNER`, `ORG_ADMIN`, `MANAGER`, `EMPLOYEE`) are evaluated independently of client inputs.
3. **Database RLS Policies**: PostgreSQL Row Level Security enforces that queries cannot return rows with mismatched `organization_id`.
4. **Input Sanitization**: Request bodies are parsed and validated via strict Zod schemas, rejecting unwhitelisted fields.

---

## 4. No Privileged Credentials in Client Bundles

- The web bundle (`apps/web/dist`) contains zero backend secrets or database passwords.
- The Android application binary (`apps/android`) contains zero embedded API keys or backend credentials.

# Deployment & DevOps Guide

## 1. Local Development Setup

### 1.1 Prerequisites
- Node.js >= 18 (Tested on Node.js 24)
- npm >= 9 (Tested on npm 11)
- Java JDK >= 17 (Tested on OpenJDK 21)
- Android SDK (API 34/35)

### 1.2 Quickstart Run
```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Build packages
npm run build --workspace=@callyzer/shared-types
npm run build --workspace=@callyzer/api-client

# 3. Start Backend API (Port 4000)
npm run dev --workspace=services/api

# 4. In a separate terminal, start Web Application (Port 3000)
npm run dev --workspace=apps/web
```

---

## 2. Docker & Containerized Deployment

A multi-stage `Dockerfile` is provided for the API service:

```dockerfile
# Run with Docker Compose
docker compose up -d
```

---

## 3. Production Cloud Hosting

### 3.1 Web Frontend on Vercel
1. Connect GitHub repository to Vercel.
2. Set Root Directory to `apps/web`.
3. Set Build Command to `npm run build`.
4. Set Output Directory to `dist`.
5. Configure environment variable:
   - `VITE_API_URL`: `https://api.yourdomain.com`

### 3.2 Backend API on Railway
1. Create new Railway project from GitHub repo.
2. Set Root Directory to `services/api`.
3. Configure environment variables:
   - `PORT`: `4000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<secure_random_hex>`
   - `DATABASE_URL`: `postgresql://postgres:<password>@<host>:5432/<db>`

### 3.3 Supabase Database Setup
1. Create new Supabase Project.
2. Navigate to SQL Editor.
3. Apply migration `database/migrations/001_initial_schema.sql`.
4. (Optional) Run seed `database/seed/seed.sql` for initial demonstration data.

---

## 4. Building the Android Application

To build the debug APK:
```bash
cd apps/android
./gradlew assembleDebug
```
The resulting APK is generated at:
`apps/android/app/build/outputs/apk/debug/app-debug.apk`

To run local unit tests on the Android application:
```bash
./gradlew test
```

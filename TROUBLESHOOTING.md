# Troubleshooting

## 1) Backend Fails to Start

### Symptom
- App exits at startup

### Checks
- Verify DATABASE_URL is valid
- Ensure PostgreSQL is reachable
- Ensure schema exists (or run prisma db push)

### Fix

```bash
npm run prisma:push --workspace=backend
npm run dev --workspace=backend
```

## 2) Login Returns 500

### Checks
- Backend logs for Prisma errors (for example missing tables)
- JWT_SECRET present

### Fix
- Apply schema and restart backend

## 3) Frontend Cannot Reach API

### Checks
- NEXT_PUBLIC_API_URL in frontend/.env.local
- Backend running on expected port
- CORS FRONTEND_URL includes frontend origin

## 4) CORS Errors

### Checks
- BACKEND FRONTEND_URL format and comma-separated entries

### Fix example

```env
FRONTEND_URL="http://localhost:3000"
```

## 5) Port Conflicts

### Symptom
- EADDRINUSE on 3000 or 5000

### Fix
- Stop conflicting process or set alternative port
- Backend supports --port=<value>

## 6) Prisma Client or Migration Issues

### Fix sequence

```bash
npm run prisma:push --workspace=backend
npm run build --workspace=backend
```

For migration workflow:

```bash
npm run prisma:migrate --workspace=backend
```

## 7) Supervisor Site Assignment Errors

### Symptom
- Cannot assign a site to supervisor

### Cause
- Site already assigned to another supervisor

### Fix
- Reassign or clear existing supervisor mapping first

## 8) Dashboard Data Looks Stale

### Checks
- Refresh profile endpoint behavior after auth hydration
- Confirm latest leave status was persisted

## 9) Frontend Lint Command Behavior

If lint command behaves unexpectedly with current Next.js version, validate with build as the primary gate:

```bash
npm run build --workspace=frontend
```

## 10) Last Resort Reset (Local Only)
- Reinstall dependencies:

```bash
npm run install-all
```

- Re-push schema:

```bash
npm run prisma:push --workspace=backend
```

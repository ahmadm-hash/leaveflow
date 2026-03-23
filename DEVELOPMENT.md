# Development Guide

## Workspace Model
LeaveFlow is an npm workspace monorepo:
- backend: Express API + Prisma
- frontend: Next.js app

## Daily Workflow
1. Pull latest changes
2. Install dependencies if lockfile changed
3. Start services
4. Implement feature/fix
5. Validate with build and targeted tests
6. Commit and push

## Start Commands
From root:

```bash
npm run dev
```

Individual services:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

## Build Commands

```bash
npm run build
npm run build --workspace=backend
npm run build --workspace=frontend
```

## Backend Conventions
- Keep TypeScript strict
- Keep controller style as exported objects with async methods returning Promise<void>
- Preserve auth middleware request extension for req.user
- Keep role checks in middleware/controller guards
- Update Prisma schema first for model changes, then apply migration/push

## Frontend Conventions
- App Router under frontend/app
- Keep services under frontend/app/lib
- Keep global auth state in Zustand store
- Maintain role-aware UI behavior

## Authorization Model
Canonical roles:
- EMPLOYEE
- SUPERVISOR
- DEPARTMENT_HEAD
- ADMIN

Delegated department-head behavior is supported through supervisor accounts via effective role logic in backend middleware.

## Database Workflow
After Prisma schema changes:

```bash
npm run prisma:migrate --workspace=backend
```

For quick schema sync:

```bash
npm run prisma:push --workspace=backend
```

Open Prisma Studio:

```bash
npm run prisma:studio --workspace=backend
```

## Recommended Validation Before Commit
- Frontend build passes
- Backend build passes
- Critical user flows still work (login, create leave, review leave)
- No unintended API shape changes

## Production Start Notes
Backend production start script currently ensures schema before server startup:

```bash
prisma db push --skip-generate && node dist/index.js
```

This avoids boot failures in fresh databases.

## Related Docs
- ENDPOINTS_GUIDE.md
- API_TESTING.md
- TESTING.md
- TROUBLESHOOTING.md

# Project Guidelines

## Project Context
LeaveFlow is a leave management system with npm workspaces:
- backend: Node.js + Express + Prisma + PostgreSQL
- frontend: Next.js App Router + React + Zustand + Axios

Four role values are used across the system and should remain consistent: EMPLOYEE, SUPERVISOR, DEPARTMENT_HEAD, ADMIN.

## Build and Test
Run from repository root unless noted.

- Install all dependencies: npm run install-all
- Start both apps: npm run dev
- Build both apps: npm run build

Backend commands:
- Dev server (default port 5000): npm run dev --workspace=backend
- Build: npm run build --workspace=backend
- Start production build: npm run start --workspace=backend
- Prisma migrate after schema changes: npm run prisma:migrate --workspace=backend

Frontend commands:
- Dev server (default port 3000): npm run dev --workspace=frontend
- Build: npm run build --workspace=frontend
- Start production build: npm run start --workspace=frontend
- Lint: npm run lint --workspace=frontend

## Architecture
Backend request flow:
- Routes in backend/src/routes
- Controllers in backend/src/controllers
- Auth and authorization middleware in backend/src/middleware/auth.ts
- Prisma schema in backend/prisma/schema.prisma

Frontend structure:
- Auth pages in frontend/app/(auth)
- Dashboard pages in frontend/app/dashboard
- API services in frontend/app/lib
- Zustand stores in frontend/app/store

Cross-app integration:
- Backend CORS origin defaults to http://localhost:3000
- Frontend API client is initialized in frontend/app/layout.tsx

## Conventions
- Keep TypeScript strict and avoid introducing any in both workspaces.
- Follow existing backend controller style: exported controller objects with async methods returning Promise<void>.
- Preserve the Express Request extension pattern for req.user in auth middleware.
- Keep role-based access checks in middleware or controller guards and use existing role string values.
- For schema/model changes, update Prisma schema first, run migration, then update controllers/services.

## Common Pitfalls
- Most startup failures are environment issues: invalid backend DATABASE_URL, PostgreSQL not running, or port conflicts on 5000/3000.
- If dependencies fail to install, clear cache and reinstall before changing code.
- Avoid changing API response shapes unless both backend controllers and frontend services/pages are updated together.

## Reference Docs
Use these docs instead of duplicating details in responses or edits:
- Project overview and roles: README.md
- Setup steps: QUICKSTART.md
- Developer workflow and stack: DEVELOPMENT.md
- Directory map: FILE_STRUCTURE.md
- Endpoint details: ENDPOINTS_GUIDE.md
- API testing examples: API_TESTING.md
- Test scenarios: TESTING.md
- Troubleshooting steps: TROUBLESHOOTING.md

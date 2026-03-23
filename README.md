# LeaveFlow

LeaveFlow is a full-stack leave management system built with npm workspaces.

## Tech Stack
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: Next.js App Router, React, TypeScript, Zustand, Axios
- Auth: JWT + role-based authorization

## Roles
The system uses four canonical roles everywhere:
- EMPLOYEE
- SUPERVISOR
- DEPARTMENT_HEAD
- ADMIN

## Core Capabilities
- Centralized login with JWT
- Role-aware user management
- Site management and supervisor assignment
- Leave request lifecycle with multi-step review
- Leave cancellation request workflow
- Interactive calendars for personal and site visibility
- Dashboard presence metrics (weekly and monthly)
- Excel export for filtered leave reports

## Repository Layout
- backend: API server and Prisma schema
- frontend: Next.js application
- root package.json: workspace scripts

## Prerequisites
- Node.js 20.x
- npm 10.x
- PostgreSQL

## Quick Start
1. Install dependencies:
   - npm run install-all
2. Configure environment variables (see QUICKSTART.md)
3. Start both apps:
   - npm run dev
4. Open:
   - Frontend: http://localhost:3000
   - Backend health: http://localhost:5000/api/health

## Root Scripts
- npm run install-all
- npm run dev
- npm run build
- npm run start

## Backend Scripts
- npm run dev --workspace=backend
- npm run build --workspace=backend
- npm run start --workspace=backend
- npm run prisma:migrate --workspace=backend
- npm run prisma:push --workspace=backend
- npm run prisma:studio --workspace=backend

## Frontend Scripts
- npm run dev --workspace=frontend
- npm run build --workspace=frontend
- npm run start --workspace=frontend
- npm run lint --workspace=frontend

## Environment Notes
Backend commonly uses:
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL
- BACKEND_PORT or PORT

Frontend commonly uses:
- NEXT_PUBLIC_API_URL

## Documentation Map
- QUICKSTART.md: setup in minutes
- DEVELOPMENT.md: engineering workflow
- ENDPOINTS_GUIDE.md: route-level API reference
- API_TESTING.md: curl examples
- TESTING.md: manual test scenarios
- TROUBLESHOOTING.md: common fixes
- FILE_STRUCTURE.md: directory map
- QUICK_REFERENCE.md: command cheat sheet
- INDEX.md: full doc index

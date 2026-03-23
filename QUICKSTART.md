# Quick Start

This guide gets LeaveFlow running locally as fast as possible.

## 1) Prerequisites
- Node.js 20.x
- npm 10.x
- PostgreSQL running locally or remotely

## 2) Install Dependencies
From repository root:

```bash
npm run install-all
```

## 3) Configure Backend Environment
Create backend environment file:
- Path: backend/.env

Suggested values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/leaveflow?schema=public"
JWT_SECRET="change-this-in-production"
FRONTEND_URL="http://localhost:3000"
BACKEND_PORT=5000
NODE_ENV=development
```

## 4) Configure Frontend Environment
Create frontend environment file:
- Path: frontend/.env.local

Suggested values:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

## 5) Initialize Database
If this is a fresh database, push schema:

```bash
npm run prisma:push --workspace=backend
```

If you are using migrations in active development:

```bash
npm run prisma:migrate --workspace=backend
```

## 6) Run the System
From root:

```bash
npm run dev
```

Or run services separately:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

## 7) Verify
- Backend health: http://localhost:5000/api/health
- Frontend: http://localhost:3000

## 8) Build Check

```bash
npm run build
```

## Common First-Run Issues
- Invalid DATABASE_URL
- PostgreSQL service not running
- Port conflicts on 3000 or 5000
- Missing NEXT_PUBLIC_API_URL in frontend/.env.local

For deeper diagnostics see TROUBLESHOOTING.md.

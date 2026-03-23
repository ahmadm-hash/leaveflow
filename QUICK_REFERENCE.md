# Quick Reference

## Roles
- EMPLOYEE
- SUPERVISOR
- DEPARTMENT_HEAD
- ADMIN

## Root Commands
```bash
npm run install-all
npm run dev
npm run build
npm run start
```

## Backend Commands
```bash
npm run dev --workspace=backend
npm run build --workspace=backend
npm run start --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:push --workspace=backend
npm run prisma:studio --workspace=backend
```

## Frontend Commands
```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
npm run start --workspace=frontend
npm run lint --workspace=frontend
```

## Key Endpoints
- POST /api/auth/login
- GET /api/users/profile
- POST /api/leaves
- GET /api/leaves/all
- POST /api/leaves/:leaveRequestId/review
- GET /api/sites
- PUT /api/users/supervisor-sites

## Environment Variables
Backend:
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL
- BACKEND_PORT or PORT

Frontend:
- NEXT_PUBLIC_API_URL

## Fast Health Checks
- Backend: http://localhost:5000/api/health
- Frontend: http://localhost:3000

## Build Gate
```bash
npm run build
```

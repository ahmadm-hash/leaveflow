# Project Summary (Legacy Filename)

This file keeps its historical filename for repository compatibility, but the content is fully English.

## Overview
LeaveFlow is a workspace-based leave management platform with:
- Backend API in Express + Prisma + PostgreSQL
- Frontend dashboard in Next.js + React + Zustand

## Main Features
- JWT authentication
- Role-based access control
- Site and supervisor assignment management
- Leave approvals and cancellation request flow
- Dashboard metrics and Excel exports

## Roles
- EMPLOYEE
- SUPERVISOR
- DEPARTMENT_HEAD
- ADMIN

## Operational Notes
- Backend startup script applies schema push before launch
- Delegated department-head behavior is supported through effective role mapping
- Frontend dashboard behavior is role-aware by design

## Documentation
See INDEX.md for the current documentation map.

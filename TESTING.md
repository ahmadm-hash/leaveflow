# Testing Guide

This project currently relies on manual and API-level validation.

## A) Environment Validation
1. Backend starts without crash
2. Frontend starts and can reach backend
3. PostgreSQL connection is valid
4. /api/health returns success

## B) Authentication Tests
1. Login with valid user
2. Login with invalid credentials
3. Access protected route without token (expect 401)
4. Reset password scope checks:
   - self reset
   - supervisor resetting supervised employee
   - unauthorized scope (expect 403)

## C) User Management Tests
1. Supervisor creates employee in supervised site
2. Supervisor cannot create non-employee accounts
3. Department-head creates supervisor
4. Deactivate user and verify status changes
5. Toggle supervisor access and verify role transition
6. Assign supervisor sites and verify no site conflicts
7. Toggle delegated department-head on supervisor

## D) Leave Workflow Tests
1. Employee creates annual leave within balance
2. Employee cannot exceed annual leave balance
3. Sick leave requires PDF document URL
4. Supervisor approves pending leave
5. Department-head approves supervisor-approved leave
6. Reject flow records correct status
7. Employee cancellation request flow from approved states

## E) Dashboard Tests
1. Supervisor sees site-scoped presence metrics
2. Department-head/admin sees cross-site metrics
3. Presence by site table renders expected values
4. Excel export respects date, site, and employee filters
5. Department-head dashboard does not show self leave submission action

## F) Site and Department Tests
1. Department-head creates new site
2. Site list renders supervisor assignments
3. Department list retrieval works
4. Department create permission checks

## G) Build Validation
Run before merging:

```bash
npm run build
```

Optional targeted builds:

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
```

## Release Smoke Test
1. Login
2. Create leave request
3. Review and approve
4. Open dashboard metrics
5. Export Excel report
6. Verify site assignment updates

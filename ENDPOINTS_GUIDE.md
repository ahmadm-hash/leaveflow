# Endpoints Guide

Base URL (local):
- http://localhost:5000/api

Authentication:
- Most endpoints require: Authorization: Bearer <token>

## Auth

### POST /auth/register
- Public route
- Behavior: self-registration is currently disabled and returns 403

### POST /auth/login
- Public route
- Returns token + user payload

### POST /auth/reset-password/:userId
- Protected
- Allowed roles: EMPLOYEE, SUPERVISOR, DEPARTMENT_HEAD, ADMIN
- Notes:
  - Admin/department-head can reset broader scope
  - Supervisor can reset employee passwords in supervised sites
  - Users can reset their own password

## Users

### GET /users/profile
- Protected
- Returns current user profile

### PUT /users/profile
- Protected
- Updates current user profile fields

### GET /users
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD (including delegated effective role)
- Returns all users

### POST /users
- Protected
- Allowed roles: SUPERVISOR, DEPARTMENT_HEAD
- Creates employee/supervisor depending on actor rules

### GET /users/site-employees
- Protected
- Allowed role: SUPERVISOR
- Returns employees in supervised sites

### POST /users/promote-supervisor
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Convenience endpoint to enable supervisor access

### PUT /users/supervisor-access
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Enables/disables supervisor role access

### PUT /users/supervisor-sites
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Assigns supervised sites for a supervisor

### PUT /users/department-head-delegation
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Toggles delegated department-head powers on supervisors

### PUT /users/:userId/deactivate
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Deactivates user and clears delegated/supervisor links when applicable

## Leaves

### POST /leaves
- Protected
- Allowed roles: EMPLOYEE, SUPERVISOR, DEPARTMENT_HEAD, ADMIN
- Creates leave request

### GET /leaves/my
- Protected
- Returns current user leave requests

### GET /leaves/all
- Protected
- Allowed roles: SUPERVISOR, DEPARTMENT_HEAD, ADMIN
- Scope is role-aware:
  - Supervisor: supervised sites only (unless effective department-head privileges)
  - Department-head/admin: global

### PUT /leaves/:leaveRequestId/cancel
- Protected
- Cancels pending request directly
- For approved requests, creates cancellation request flow

### GET /leaves/pending/site
- Protected
- Allowed roles: SUPERVISOR, DEPARTMENT_HEAD, ADMIN
- Returns pending requests by role scope

### POST /leaves/:leaveRequestId/review
- Protected
- Allowed roles: SUPERVISOR, DEPARTMENT_HEAD, ADMIN
- Body action: approve | reject

## Departments

### GET /departments
- Protected
- Returns departments list

### POST /departments
- Protected
- Allowed roles: ADMIN, DEPARTMENT_HEAD
- Creates department

## Sites

### GET /sites
- Protected
- Returns sites list

### POST /sites
- Protected
- Allowed role: DEPARTMENT_HEAD (effective role supported)
- Creates site

## Utility

### GET /health
- Public
- Returns server status and timestamp

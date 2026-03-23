# API Testing (cURL)

Base URL:

```bash
export BASE_URL=http://localhost:5000/api
```

Windows PowerShell:

```powershell
$BASE_URL = "http://localhost:5000/api"
```

## 1) Login

```bash
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee1",
    "password": "password123"
  }'
```

Save token from response and use it in protected calls.

## 2) Get Profile

```bash
curl -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 3) Update Profile

```bash
curl -X PUT "$BASE_URL/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fullName": "Updated Name",
    "email": "updated@example.com"
  }'
```

## 4) Create Leave Request

```bash
curl -X POST "$BASE_URL/leaves" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2026-03-25",
    "endDate": "2026-03-27",
    "leaveType": "ANNUAL",
    "reason": "Family event"
  }'
```

For sick leave include PDF URL:

```json
{
  "leaveType": "SICK",
  "documentUrl": "https://example.com/report.pdf"
}
```

## 5) Get My Leaves

```bash
curl -X GET "$BASE_URL/leaves/my" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 6) Manager: Get All Leaves

```bash
curl -X GET "$BASE_URL/leaves/all" \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

## 7) Manager: Review Leave

```bash
curl -X POST "$BASE_URL/leaves/LEAVE_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -d '{
    "action": "approve",
    "comment": "Approved"
  }'
```

## 8) Employee: Cancel Leave

```bash
curl -X PUT "$BASE_URL/leaves/LEAVE_ID/cancel" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 9) Department Head: Create Site

```bash
curl -X POST "$BASE_URL/sites" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DEPT_HEAD_TOKEN" \
  -d '{
    "name": "Site A",
    "location": "Riyadh"
  }'
```

## 10) Department Head/Admin: Assign Supervisor Sites

```bash
curl -X PUT "$BASE_URL/users/supervisor-sites" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_OR_DEPT_HEAD_TOKEN" \
  -d '{
    "userId": "SUPERVISOR_USER_ID",
    "siteIds": ["SITE_ID_1", "SITE_ID_2"]
  }'
```

## 11) Health Check

```bash
curl -X GET "$BASE_URL/health"
```

## Common Error Codes
- 400: Validation or business rule failure
- 401: Missing/invalid token
- 403: Role not allowed
- 404: Resource not found
- 500: Internal server error

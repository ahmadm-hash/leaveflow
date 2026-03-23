


#### `POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "username": "username123",
  "password": "password123",
}
```

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "cuid123",
    "email": "user@example.com",
    "username": "username123",
    "role": "EMPLOYEE"
  }
}
```

---

#### `POST /api/auth/login`

```json
{
  "username": "username123",
  "password": "password123"
}
```

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cuid123",
    "username": "username123",
    "email": "user@example.com",
    "role": "EMPLOYEE"
  }
}
```

```
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### `POST /api/auth/reset-password/:userId`


```json
{
  "newPassword": "newpassword123"
}
```

```json
{
  "message": "Password reset successfully"
}
```

---


#### `GET /api/users/profile`

```json
{
  "user": {
    "id": "cuid123",
    "email": "user@example.com",
    "username": "username123",
    "role": "EMPLOYEE",
    "annualLeaveBalance": 30,
    "site": {
      "id": "site123",
    }
  }
}
```

---

#### `PUT /api/users/profile`

```json
{
  "email": "newemail@example.com"
}
```

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "cuid123",
    "email": "newemail@example.com",
    "username": "username123",
    "role": "EMPLOYEE"
  }
}
```

---

#### `GET /api/users`


```json
{
  "users": [
    {
      "id": "user123",
      "email": "user@example.com",
      "username": "user1",
      "role": "EMPLOYEE",
      "isActive": true,
      "site": {
        "id": "site123",
      }
    },
    {
      "id": "user456",
      "email": "supervisor@example.com",
      "username": "supervisor1",
      "role": "SUPERVISOR",
      "isActive": true,
      "site": {
        "id": "site123",
      }
    }
  ]
}
```

---

#### `GET /api/users/site-employees`


```json
{
  "users": [
    {
      "id": "user123",
      "email": "emp1@example.com",
      "username": "emp1",
      "role": "EMPLOYEE",
      "isActive": true,
      "annualLeaveBalance": 30
    },
    {
      "id": "user124",
      "email": "emp2@example.com",
      "username": "emp2",
      "role": "EMPLOYEE",
      "isActive": true,
      "annualLeaveBalance": 28
    }
  ]
}
```

---

#### `POST /api/users/promote-supervisor`


```json
{
  "userId": "user123",
  "siteId": "site123"
}
```

```json
{
  "message": "User promoted to supervisor successfully"
}
```

---

#### `PUT /api/users/:userId/deactivate`


```json
{
  "message": "User deactivated successfully"
}
```

---



```
1. POST /api/auth/register

2. POST /api/auth/login

3. GET /api/users/profile
   ├── Header: Authorization: Bearer {token}
```

---


```

   ├── Header: Bearer {admin token}

3. POST /api/users/promote-supervisor
   ├── Header: Bearer {admin token}
   ├── Body: { userId, siteId }

4. GET /api/users/site-employees
```

---


```
1. POST /api/auth/login

2. PUT /api/users/profile
   ├── Header: Bearer {token}
   ├── Body: { fullName, email }
```

---


```

2. POST /api/auth/reset-password/{userId}
   ├── Header: Bearer {admin token}
   ├── Body: { newPassword }
```

---


```
✅ GET /api/users/profile
✅ PUT /api/users/profile
❌ GET /api/users/site-employees
❌ POST /api/users/promote-supervisor
❌ PUT /api/users/:userId/deactivate
```

```
✅ GET /api/users/profile
✅ PUT /api/users/profile
✅ GET /api/users/site-employees
❌ POST /api/users/promote-supervisor
❌ PUT /api/users/:userId/deactivate
```

```
✅ GET /api/users/profile
✅ PUT /api/users/profile
❌ GET /api/users/site-employees
✅ POST /api/users/promote-supervisor
✅ PUT /api/users/:userId/deactivate
```

```
```

---


|------|-------|-------|

---


```

```

---



---



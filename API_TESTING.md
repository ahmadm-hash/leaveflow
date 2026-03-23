

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@example.com",
    "username": "employee1",
    "password": "password123",
  }'
```

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee1",
    "password": "password123"
  }'
```

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "employee1",
    "email": "employee@example.com",
    "role": "EMPLOYEE"
  }
}
```

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "email": "newemail@example.com"
  }'
```

```bash
curl -X POST http://localhost:5000/api/users/promote-supervisor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userId": "user_id_here",
    "siteId": "site_id_here"
  }'
```

```bash
curl -X POST http://localhost:5000/api/auth/reset-password/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "newPassword": "newpassword123"
  }'
```






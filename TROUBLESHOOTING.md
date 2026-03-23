
## ❌ Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

```bash
# Windows: Services -> PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

DATABASE_URL="postgresql://user:password@localhost:5432/leaveflow"
                          ^^^^  ^^^^^^^^  ^^^^^^^    ^^^^^^^^^
                          user  password  localhost   database

createdb leaveflow

npm run prisma:migrate --workspace=backend
```

---

## ❌ Port Already in Use

```
Error: listen EADDRINUSE :::5000
```


**Windows:**
```bash
netstat -ano | findstr :5000

taskkill /PID <PID> /F

PORT=5001
```

**Mac/Linux:**
```bash
lsof -i :5000

kill -9 <PID>

PORT=5001 npm run dev
```

---

## ❌ npm install fails

```
npm ERR! Could not resolve dependency
npm ERR! peer dep missing
```

```bash
rm -rf node_modules package-lock.json

npm cache clean --force

npm install

npm install --legacy-peer-deps
```

---

## ❌ Prisma Migration Error

```
Error: The introspected database was empty
```

```bash
echo %DATABASE_URL%  # Windows
echo $DATABASE_URL   # Mac/Linux

npm run prisma:migrate --workspace=backend

dropdb leaveflow
createdb leaveflow
npm run prisma:migrate --workspace=backend
```

---

## ❌ TypeScript Compilation Error

```
error TS2304: Cannot find name 'Express'
```

```bash
npm install --save-dev @types/express @types/node

cat backend/tsconfig.json

npm run build --workspace=backend
```

---

## ❌ JWT Token Error

```
JsonWebTokenError: invalid token
```

```bash
JWT_SECRET="your-super-secret-key-change-in-production"

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

```

---

## ❌ Cors Error

```
Access to XMLHttpRequest at 'http://localhost:5000/api/...'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);


npm run dev --workspace=backend
```

---

## ❌ Frontend Not Loading

```
Page not found or blank page
```

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api

npm run dev --workspace=frontend

rm -rf .next
npm run dev --workspace=frontend

```

---

## ❌ Cannot Login



```bash
npm run prisma:studio --workspace=backend

```

```typescript
POST http://localhost:5000/api/auth/reset-password/:userId
Header: Authorization: Bearer ADMIN_TOKEN
Body: { "newPassword": "newpassword123" }
```

---

## ❌ Database Schema Mismatch

```
PrismaClientInitializationError: Your schema.prisma file is out of sync
```

```bash
npm run prisma:push --workspace=backend

npm run prisma:migrate --workspace=backend

npm run prisma:migrate reset --workspace=backend
```

---

## ❌ Module Not Found

```
Module not found: Can't resolve '@/app/store/authStore'
```

```typescript
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

import { useAuthStore } from "../../store/authStore";
```

---

## ❌ Permission Denied Error

```
Permission denied (publickey, password).
```

```bash

npm install
npm run dev

git remote set-url origin https://github.com/user/repo.git
```

---


```typescript
console.log('Request:', req.body);
console.log('User:', req.user);
console.log('Error:', error);

debugger;
```

```javascript
localStorage.getItem('auth-storage')
```

---


### Postman
```
```

### Prisma Studio
```bash
npm run prisma:studio --workspace=backend
```

### Browser DevTools
```
- Application: localStorage/cookies
```

---



---


```bash

rm -rf node_modules package-lock.json .next dist

npm install

npm run prisma:migrate --workspace=backend

npm run dev --workspace=backend
npm run dev --workspace=frontend

```

---



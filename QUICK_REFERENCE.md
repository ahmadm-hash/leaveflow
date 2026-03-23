

```bash
cd c:\Users\ahmed\Dev
npm install
```

```bash
cd backend

# DATABASE_URL="postgresql://user:password@localhost:5432/leaveflow"

npm run prisma:migrate
```

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

```
```

---


|--------|-------|

---


```bash
POST http://localhost:5000/api/auth/register

POST http://localhost:5000/api/auth/login

GET http://localhost:5000/api/users/profile
```

```
Header: Authorization: Bearer <TOKEN>
```

---


|--------|-------|

---


|-------|----------|

---


- `npm run prisma:migrate`

```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```


---



---



```typescript
- LeaveRequest endpoints
- File upload untuk PDF
- Leave balance tracking

- Approval workflow
- Supervisor portal
- Status tracking

- Analytics dashboard
- Leave reports
- Export to CSV/PDF
```

---


```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend

npm run build --workspace=backend
npm run build --workspace=frontend

npm start --workspace=backend
npm start --workspace=frontend

npm run prisma:studio --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:push --workspace=backend
```

---



---


```
✅ Backend: Ready on :5000
✅ Frontend: Ready on :3000
✅ Database: Connected
✅ Auth: Working
✅ API: Functional
✅ Ready for development!
```



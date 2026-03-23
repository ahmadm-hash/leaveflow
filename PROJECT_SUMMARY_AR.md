


### 2. **Backend (Node.js + Express + PostgreSQL)**


```
```

- RBAC (Role-Based Access Control)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/reset-password/:userId
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users
GET    /api/users/site-employees
POST   /api/users/promote-supervisor
PUT    /api/users/:userId/deactivate
```

### 3. **Frontend (React + Next.js)**


- Local Storage persistence
- Auto-logout on 401

- Token auto-attachment

- **Modern & Intuitive** UI


---






---


```bash
cd c:\Users\ahmed\Dev
npm install

npm install --workspace=backend
npm install --workspace=frontend
```

```bash
cd backend
npm run prisma:migrate
```


**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

```bash
```

---


|------|-------|---------|

---


✅ Role-based authorization
✅ SQL injection prevention (Prisma)

✅ Request caching (middleware)
✅ Database indexing
✅ Pagination ready
✅ Optimized queries

✅ Modular architecture
✅ Easy to add new features
✅ Clear separation of concerns
✅ Reusable components

---


- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [API Testing Guide](API_TESTING.md)
- [Testing Checklist](TESTING.md)

---



**Happy Coding! 🚀**


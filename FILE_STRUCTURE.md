

```
leaveflow/
│
│
│
│
│   │
│   │
│   │
│       │
│       │
│       ├── 📁 controllers/
│       │   │
│       │
│       ├── 📁 routes/
│       │   │   ├── POST /register
│       │   │   ├── POST /login
│       │   │   └── POST /reset-password/:id
│       │   │
│       │       ├── GET /profile
│       │       ├── PUT /profile
│       │       ├── GET /
│       │       ├── GET /site-employees
│       │       ├── POST /promote-supervisor
│       │       └── PUT /:id/deactivate
│       │
│       ├── 📁 middleware/
│       │
│       ├── 📁 utils/
│       │   │   ├── generateToken()
│       │   │   ├── verifyToken()
│       │   │   └── decodeToken()
│       │   │
│       │       ├── hashPassword()    - bcrypt
│       │       └── comparePassword()
│       │
│
│
│   │
│   │
│       │
│       │
│       │
│       │   │
│       │   ├── 📁 login/
│       │   │
│       │   └── 📁 register/
│       │           ├── validation
│       │
│       │   │
│       │   │   └── Logout Button
│       │   │
│       │   ├── 📁 home/
│       │   │
│       │       └── page.tsx
│       │
│       │
│       │   │
│       │   │   ├── Axios configuration
│       │   │
│       │       ├── login()
│       │       ├── register()
│       │       ├── getProfile()
│       │       └── updateProfile()
│       │
│           └── authStore.ts          Zustand
│               ├── token            - JWT Token
│               └── localStorage persistence
│
```

---


|------|---------|

### **Backend**
|------|---------|

### **Frontend**
|------|---------|

---


```
1. frontend/app/(auth)/register/page.tsx

2. backend/src/routes/authRoutes.ts

```

```
1. frontend/app/(auth)/login/page.tsx

2. backend/src/controllers/authController.ts

```

---


```
frontend/app/dashboard/home

```

```
```

---


```
```

```
```

```
```

---


```
Total Files Created:

Total Code:
  ├─ 11 Endpoints
  ├─ 6 Database Tables
  └─ 100% TypeScript

```

---



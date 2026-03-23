

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt
- **Validation:** TypeScript strict mode

### Frontend
- **Framework:** Next.js 14
- **Library:** React 18
- **Language:** TypeScript
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Styling:** Inline CSS (Light Mode)
- **UI Pattern:** Server Components + Client Components

---


```
leaveflow/
│
│   ├── src/
│   ├── prisma/
│   └── package.json
│
│   ├── app/
│   │   │   ├── login/
│   │   │   └── register/
│   ├── middleware.ts          # middleware Next.js
│   ├── next.config.js
│   ├── .env.local.example
│   └── package.json
│
├── .gitignore
```

---


```bash
cd c:\Users\ahmed\Dev

npm run dev --workspace=backend

npm run dev --workspace=frontend
```



**Backend:**
```typescript
export const resourceController = {
  getAll: async (req, res) => {
    // Logic here
  }
};

router.get('/', authMiddleware, resourceController.getAll);

app.use('/api/resources', resourceRoutes);
```

**Frontend:**
```typescript
export const resourceService = {
  async getAll() {
    return await getApiClient().get('/resources');
  }
};

```

---


### TypeScript

```typescript
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

function getUser(id: any): any {
  // ...
}
```

### React Components

```typescript
export default function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // load user
  }, []);
  
  return <div>{/* ... */}</div>;
}

class UserProfile extends React.Component {
  // ...
}
```

### API Responses

```typescript
{
  "message": "Success description",
  "data": { /* ... */ },
  "error": null,
  "status": 200
}

{
  "message": "Error description",
  "error": "ERROR_CODE",
  "status": 400
}
```

---


```bash
cd backend

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

```bash
cd frontend

```

---


```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd frontend
npm run build
```

```
- PostgreSQL database
- Node.js server
- SSL certificate
- Environment variables
- Domain name
```

---


### Debug Backend
```typescript
console.log('User:', user);

debugger;
```

### Debug Frontend
```typescript
// React DevTools
// Browser DevTools
```

---


### Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Docs](https://expressjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Packages
- **Authentication:** JWT, bcryptjs
- **Database:** Prisma, PostgreSQL
- **HTTP:** Axios, Express
- **State Management:** Zustand
- **Notifications:** React-toastify

---


### Backend
- Implement Pagination
- Cache Common Queries
- Compress Responses (gzip)

### Frontend
- Code Splitting (Automatic in Next.js)
- Image Optimization
- Lazy Loading
- State Management Optimization

---


### Backend
- ✅ Validate Input
- ✅ Sanitize Output
- ✅ Use HTTPS
- ✅ Implement CORS
- ✅ Rate Limiting
- ✅ Environment Variables

### Frontend
- ✅ XSS Prevention (React auto-escapes)
- ✅ CSRF Protection
- ✅ Secure Storage (localStorage for tokens)
- ✅ HTTPS Only

---


```
Week 1-2: Foundation ✅
  ├─ Project Setup
  ├─ Authentication System
  └─ User Management

Week 3-4: Core Features
  ├─ Leave Request System
  ├─ Approval Workflow
  └─ Calendar Views

Week 5-6: Admin Features
  ├─ Reports & Analytics
  ├─ Supervisor Portal
  └─ Department Head Dashboard

Week 7-8: Polish
  ├─ UI/UX Improvements
  ├─ Performance Optimization
  └─ Bug Fixes

Week 9-10: Deployment
  ├─ Production Setup
  ├─ Testing
  └─ Launch
```

---



---

**Happy Coding! 🎉**


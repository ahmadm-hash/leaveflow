# 💻 دليل المطور - LeaveFlow

## 🛠️ أدوات التطوير المستخدمة

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

## 📁 هيكل المشروع المقترح

```
leaveflow/
│
├── backend/                    # خادم Express
│   ├── src/
│   │   ├── index.ts           # نقطة الدخول
│   │   ├── controllers/       # منطق الطلبات
│   │   ├── routes/            # تعريفات المسارات
│   │   ├── middleware/        # وسائط (auth, validation)
│   │   ├── utils/             # دوال مساعدة
│   │   └── models/            # نماذج البيانات
│   ├── prisma/
│   │   └── schema.prisma      # تعريف البيانات
│   ├── .env.example           # متغيرات البيئة
│   └── package.json
│
├── frontend/                   # تطبيق Next.js
│   ├── app/
│   │   ├── (auth)/            # مجموعة صفحات المصادقة
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/         # صفحات لوحة التحكم
│   │   ├── components/        # مكونات React
│   │   ├── store/             # حالة Zustand
│   │   ├── lib/               # دوال مساعدة
│   │   └── page.tsx           # الصفحة الرئيسية
│   ├── middleware.ts          # middleware Next.js
│   ├── next.config.js
│   ├── .env.local.example
│   └── package.json
│
├── README.md                  # التوثيق الرئيسي
├── PROJECT_SUMMARY_AR.md      # ملخص المشروع
├── API_TESTING.md             # اختبار API
├── TESTING.md                 # جدول الاختبار
├── DEVELOPMENT.md             # دليل التطوير (هذا الملف)
├── .gitignore
└── package.json              # جذر Workspaces
```

---

## 🔄 سير العمل اليومي

### 1. البدء بالعمل
```bash
# الانتقال للمشروع
cd c:\Users\ahmed\Dev

# بدء تطوير الـ Backend
npm run dev --workspace=backend

# بدء تطوير الـ Frontend (في terminal آخر)
npm run dev --workspace=frontend
```

### 2. إضافة ميزة جديدة

#### مثال: إضافة نقطة نهاية جديدة للموارد

**Backend:**
```typescript
// 1. أضف Controller (backend/src/controllers/resourceController.ts)
export const resourceController = {
  getAll: async (req, res) => {
    // Logic here
  }
};

// 2. أضف Route (backend/src/routes/resourceRoutes.ts)
router.get('/', authMiddleware, resourceController.getAll);

// 3. استورد الـ Route في index.ts
app.use('/api/resources', resourceRoutes);
```

**Frontend:**
```typescript
// 1. أضف Service (app/lib/resourceService.ts)
export const resourceService = {
  async getAll() {
    return await getApiClient().get('/resources');
  }
};

// 2. أنشئ Component (app/components/ResourceList.tsx)
// 3. استخدمه في Page
```

---

## 📝 معايير الكود

### TypeScript
- استخدم strict mode دائماً
- حدد أنواع الدوال والمتغيرات
- تجنب `any` قدر الإمكان

```typescript
// ✅ صحيح
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ خاطئ
function getUser(id: any): any {
  // ...
}
```

### React Components
- استخدم Functional Components
- استخدم React Hooks
- فصل المنطق عن العرض

```typescript
// ✅ صحيح
export default function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // load user
  }, []);
  
  return <div>{/* ... */}</div>;
}

// ❌ تجنب
class UserProfile extends React.Component {
  // ...
}
```

### API Responses
استخدم بنية موحدة:

```typescript
// ✅ صيغة الرد الموحدة
{
  "message": "Success description",
  "data": { /* ... */ },
  "error": null,
  "status": 200
}

// أو عند الخطأ
{
  "message": "Error description",
  "error": "ERROR_CODE",
  "status": 400
}
```

---

## 🧪 الاختبار

### اختبار Backend
```bash
cd backend

# اختبر نقطة نهاية:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### اختبار Frontend
```bash
cd frontend

# استخدم React DevTools
# استخدم Browser Console للـ debugging
```

---

## 🚀 نشر النظام

### قبل النشر
```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd frontend
npm run build
```

### متطلبات الإنتاج
```
- PostgreSQL database
- Node.js server
- SSL certificate
- Environment variables
- Domain name
```

---

## 🐛 التصحيح والـ Debugging

### Debug Backend
```typescript
// استخدم console.log
console.log('User:', user);

// أو debugger
debugger;
```

### Debug Frontend
```typescript
// React DevTools
// Browser DevTools
// Zustand DevTools (للحالة)
```

---

## 📚 موارد مفيدة

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

## ⚡ نصائح الأداء

### Backend
- استخدم Database Indexes
- Implement Pagination
- Cache Common Queries
- Compress Responses (gzip)

### Frontend
- Code Splitting (Automatic in Next.js)
- Image Optimization
- Lazy Loading
- State Management Optimization

---

## 🔐 الأمان

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

## 📊 خريطة الطريق

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

## 📞 الدعم

للمساعدة أو الأسئلة:
1. راجع التوثيق الموجودة
2. تحقق من ملفات المشروع
3. جرّب أمثلة API
4. استخدم Browser DevTools

---

**Happy Coding! 🎉**

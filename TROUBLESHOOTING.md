# 🔧 حل مشاكل شائعة - LeaveFlow

## ❌ Database Connection Error

### الرسالة
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### الحل
```bash
# 1. تحقق من تشغيل PostgreSQL
# Windows: Services -> PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# 2. تحقق من DATABASE_URL في backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/leaveflow"
                          ^^^^  ^^^^^^^^  ^^^^^^^    ^^^^^^^^^
                          user  password  localhost   database

# 3. أنشئ قاعدة البيانات إذا كانت غير موجودة
createdb leaveflow

# 4. شغل الهجرات
npm run prisma:migrate --workspace=backend
```

---

## ❌ Port Already in Use

### الرسالة
```
Error: listen EADDRINUSE :::5000
```

### الحل

**Windows:**
```bash
# 1. اعثر على العملية المستخدمة للـ port
netstat -ano | findstr :5000

# 2. اقتل العملية (PID)
taskkill /PID <PID> /F

# أو استخدم port آخر في .env
PORT=5001
```

**Mac/Linux:**
```bash
# 1. اعثر على العملية
lsof -i :5000

# 2. اقتل العملية
kill -9 <PID>

# أو استخدم port آخر
PORT=5001 npm run dev
```

---

## ❌ npm install fails

### الرسالة
```
npm ERR! Could not resolve dependency
npm ERR! peer dep missing
```

### الحل
```bash
# 1. احذف node_modules والـ lock file
rm -rf node_modules package-lock.json

# 2. نظف npm cache
npm cache clean --force

# 3. أعد التثبيت
npm install

# أو
npm install --legacy-peer-deps
```

---

## ❌ Prisma Migration Error

### الرسالة
```
Error: The introspected database was empty
```

### الحل
```bash
# 1. تحقق من DATABASE_URL
echo %DATABASE_URL%  # Windows
echo $DATABASE_URL   # Mac/Linux

# 2. أعد محاولة الهجرة
npm run prisma:migrate --workspace=backend

# 3. إذا فشل، أعد تعيين قاعدة البيانات
# احذف قاعدة البيانات وأنشئها من جديد
dropdb leaveflow
createdb leaveflow
npm run prisma:migrate --workspace=backend
```

---

## ❌ TypeScript Compilation Error

### الرسالة
```
error TS2304: Cannot find name 'Express'
```

### الحل
```bash
# 1. تثبيت أنواع TypeScript المفقودة
npm install --save-dev @types/express @types/node

# 2. تحقق من tsconfig.json
cat backend/tsconfig.json

# 3. أعد بناء المشروع
npm run build --workspace=backend
```

---

## ❌ JWT Token Error

### الرسالة
```
JsonWebTokenError: invalid token
```

### الحل
```bash
# 1. تأكد من أن JWT_SECRET محدد في .env
JWT_SECRET="your-super-secret-key-change-in-production"

# 2. تحقق من صيغة الـ header
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
              ^^^^^^ هام جداً

# 3. تحقق من انتهاء صلاحية الـ Token
# Token له صلاحية محدودة (افتراضياً 7 أيام)
# سجل دخول من جديد للحصول على token جديد
```

---

## ❌ Cors Error

### الرسالة
```
Access to XMLHttpRequest at 'http://localhost:5000/api/...'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

### الحل
```typescript
// تحقق من backend/src/index.ts
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// إذا لم ينجح، جرّب:
app.use(cors()); // السماح الكامل (للتطوير فقط)

// وأعد تشغيل الخادم
npm run dev --workspace=backend
```

---

## ❌ Frontend Not Loading

### الرسالة
```
Page not found or blank page
```

### الحل
```bash
# 1. تحقق من NEXT_PUBLIC_API_URL في frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# 2. تأكد من أن Next.js يعمل
npm run dev --workspace=frontend

# 3. افسح الـ cache
rm -rf .next
npm run dev --workspace=frontend

# 4. تحقق من أخطاء في Browser Console
# افتح DevTools (F12) وانظر للـ Console
```

---

## ❌ Cannot Login

### الأعراض
- "Invalid credentials" مع بيانات صحيحة
- لا يمكن دخول حساب تم تسجيله للتو

### الحل

**الحالة 1: المستخدم جديد**
```bash
# 1. تحقق من أن قاعدة البيانات تحتوي على المستخدم
npm run prisma:studio --workspace=backend
# انظر للجدول "users"

# 2. تأكد من أن التسجيل تم بنجاح
# راقب logs الخادم
```

**الحالة 2: نسيان كلمة المرور**
```typescript
// استخدم إعادة تعيين كلمة المرور
POST http://localhost:5000/api/auth/reset-password/:userId
Header: Authorization: Bearer ADMIN_TOKEN
Body: { "newPassword": "newpassword123" }
```

---

## ❌ Database Schema Mismatch

### الرسالة
```
PrismaClientInitializationError: Your schema.prisma file is out of sync
```

### الحل
```bash
# 1. نزّل التغييرات من schema إلى قاعدة البيانات
npm run prisma:push --workspace=backend

# 2. أو أعد إنشاء الهجرة
npm run prisma:migrate --workspace=backend

# 3. إذا استمرت المشكلة:
npm run prisma:migrate reset --workspace=backend
# (تحذير: هذا سيحذف البيانات!)
```

---

## ❌ Module Not Found

### الرسالة
```
Module not found: Can't resolve '@/app/store/authStore'
```

### الحل
```typescript
// تحقق من المسار في tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

// أو استخدم المسار الكامل
import { useAuthStore } from "../../store/authStore";
```

---

## ❌ Permission Denied Error

### الرسالة
```
Permission denied (publickey, password).
```

### الحل
```bash
# هذا الخطأ عادة يتعلق بـ Git/SSH وليس بالمشروع

# لتشغيل المشروع محلياً، لا تحتاج إلى SSH
npm install
npm run dev

# أو استخدم HTTPS بدلاً من SSH في Git
git remote set-url origin https://github.com/user/repo.git
```

---

## ✅ صفحات التصحيح المفيدة

### في الخادم (Backend)
```typescript
// أضف console.log للـ debugging
console.log('Request:', req.body);
console.log('User:', req.user);
console.log('Error:', error);

// استخدم debugger
debugger;
// ثم شغل: node --inspect src/index.ts
```

### في المتصفح (Frontend)
```javascript
// افتح DevTools (F12)
// Console: اكتب console.log(...)
// Network: انظر للطلبات والـ responses
// Storage: تحقق من localStorage للـ token
localStorage.getItem('auth-storage')
```

---

## 🔍 أدوات تصحيح مفيدة

### Postman
```
1. استورد LeaveFlow_API.postman_collection.json
2. عيّن متغيرات
3. اختبر الـ API مباشرة
```

### Prisma Studio
```bash
npm run prisma:studio --workspace=backend
# يفتح واجهة بصرية لقاعدة البيانات
```

### Browser DevTools
```
F12 أو Ctrl+Shift+I
- Console: رسائل الخطأ
- Network: طلبات API
- Application: localStorage/cookies
```

---

## 📞 عند عدم حل المشكلة

1. **اقرأ الرسالة بعناية** - تحتوي على تفاصيل المشكلة
2. **ابحث عن المسار** - أين بالضبط حدثت المشكلة؟
3. **تفقد السجلات** - logs الخادم والمتصفح
4. **جرّب الحل البسيط أولاً** - إعادة التشغيل غالباً تحل المشاكل
5. **ابدأ من جديد** - احذف node_modules وأعد التثبيت

---

## 🎯 نصيحة ذهبية

```bash
# عندما تحتار، جرّب هذا:

# 1. نظف كل شيء
rm -rf node_modules package-lock.json .next dist

# 2. أعد التثبيت
npm install

# 3. أعد تشغيل migrations
npm run prisma:migrate --workspace=backend

# 4. اختبر من جديد
npm run dev --workspace=backend
npm run dev --workspace=frontend

# 99% من المشاكل تُحل بهذه الطريقة!
```

---

**آخر تحديث:** الآن

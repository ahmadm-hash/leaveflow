# 🎯 دليل سريع - LeaveFlow

## ⚡ البدء في 5 دقائق

### الخطوة 1: تثبيت المكتبات
```bash
cd c:\Users\ahmed\Dev
npm install
```

### الخطوة 2: إعداد قاعدة البيانات
```bash
cd backend

# عدّل DATABASE_URL في .env
# DATABASE_URL="postgresql://user:password@localhost:5432/leaveflow"

npm run prisma:migrate
```

### الخطوة 3: تشغيل الخادم (Terminal 1)
```bash
cd backend
npm run dev
# 🚀 يعمل على http://localhost:5000
```

### الخطوة 4: تشغيل الواجهة (Terminal 2)
```bash
cd frontend
npm run dev
# 🌐 يعمل على http://localhost:3000
```

### الخطوة 5: التسجيل واختبار
```
1. افتح http://localhost:3000
2. انقر "Register" وأنشئ حساب
3. سجل دخولك
4. ستجد نفسك في لوحة التحكم ✅
```

---

## 📋 ملخص الملفات المهمة

| المسار | الوصف |
|--------|-------|
| **backend/src/index.ts** | نقطة دخول الخادم |
| **backend/prisma/schema.prisma** | نموذج قاعدة البيانات |
| **backend/src/controllers/** | منطق الطلبات |
| **backend/src/routes/** | تعريف المسارات |
| **frontend/app/page.tsx** | الصفحة الرئيسية |
| **frontend/app/store/authStore.ts** | إدارة الحالة |
| **frontend/app/lib/apiClient.ts** | معالج الـ API |

---

## 🔌 أهم نقاط API

```bash
# التسجيل
POST http://localhost:5000/api/auth/register

# تسجيل الدخول
POST http://localhost:5000/api/auth/login

# الملف الشخصي
GET http://localhost:5000/api/users/profile
```

**ملاحظة:** جميع الطلبات (ما عدا login/register) تتطلب:
```
Header: Authorization: Bearer <TOKEN>
```

---

## 🎨 صفحات متاحة

| الرابط | الوصف |
|--------|-------|
| `/login` | تسجيل الدخول |
| `/register` | إنشاء حساب |
| `/dashboard/home` | لوحة التحكم |
| `/dashboard/profile` | الملف الشخصي |

---

## 👥 أنواع المستخدمين

| النوع | الصلاحيات |
|-------|----------|
| **EMPLOYEE** | عرض ملفه الشخصي فقط |
| **SUPERVISOR** | إدارة موظفي الموقع |
| **DEPARTMENT_HEAD** | موافقة أولية ورؤية الكل |
| **ADMIN** | صلاحيات كاملة |

---

## 🔧 معالجة المشاكل

### المشكلة: Database connection error
**الحل:** تحقق من:
- هل PostgreSQL يعمل؟
- هل DATABASE_URL صحيح؟
- `npm run prisma:migrate`

### المشكلة: Port 5000/3000 مستخدم
**الحل:**
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### المشكلة: Unauthorized error (401)
**الحل:**
- تأكد من إرسال Token صحيح
- تحقق من انتهاء صلاحية Token
- سجل دخول من جديد

---

## 📚 الملفات الموصى بها للقراءة

1. **أولاً:** [QUICKSTART.md](QUICKSTART.md)
2. **ثانياً:** [ENDPOINTS_GUIDE.md](ENDPOINTS_GUIDE.md)
3. **ثالثاً:** [API_TESTING.md](API_TESTING.md)
4. **رابعاً:** [DEVELOPMENT.md](DEVELOPMENT.md)

---

## 🚀 الخطوات التالية

بعد اختبار النظام الأساسي، أضف:

```typescript
// Phase 2: نظام طلبات الإجازات
- LeaveRequest endpoints
- File upload untuk PDF
- Leave balance tracking

// Phase 3: نظام الموافقات
- Approval workflow
- Supervisor portal
- Status tracking

// Phase 4: التقارير
- Analytics dashboard
- Leave reports
- Export to CSV/PDF
```

---

## 💻 أوامر مفيدة

```bash
# تطوير
npm run dev --workspace=backend
npm run dev --workspace=frontend

# بناء
npm run build --workspace=backend
npm run build --workspace=frontend

# إنتاج
npm start --workspace=backend
npm start --workspace=frontend

# قاعدة البيانات
npm run prisma:studio --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:push --workspace=backend
```

---

## ✅ قائمة التحقق

- [ ] npm install تم بنجاح
- [ ] DATABASE_URL محدث
- [ ] npm run prisma:migrate تم
- [ ] Backend يعمل على :5000
- [ ] Frontend يعمل على :3000
- [ ] تم إنشاء حساب جديد
- [ ] تم تسجيل الدخول بنجاح
- [ ] Dashboard يظهر بيانات المستخدم

---

## 🎉 تم!

```
✅ Backend: Ready on :5000
✅ Frontend: Ready on :3000
✅ Database: Connected
✅ Auth: Working
✅ API: Functional
✅ Ready for development!
```

**استمتع بالتطوير! 🚀**

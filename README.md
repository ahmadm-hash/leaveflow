# LeaveFlow - نظام إدارة الإجازات الرقمي

## 📋 نظرة عامة

**LeaveFlow** هو نظام تقني متكامل ومخصص لإدارة الإجازات الموظفين. يحول المعاملات الورقية المعقدة إلى مسار رقمي سلس يعتمد على مبدأ "تعدد الأدوار" (Role-Based Access Control).

## 🏗️ البنية المعمارية

### Frontend (React/Next.js)
```
frontend/
├── app/
│   ├── (auth)          # صفحات المصادقة
│   ├── dashboard/      # لوحات التحكم حسب الدور
│   ├── components/     # المكونات المعاد استخدامها
│   ├── lib/           # خدمات ووظائف مساعدة
│   └── store/         # إدارة الحالة (Zustand)
└── public/            # الملفات الثابتة
```

### Backend (Node.js/Express + PostgreSQL)
```
backend/
├── src/
│   ├── controllers/    # منطق الطلبات
│   ├── routes/         # تعريفات المسارات
│   ├── middleware/     # الوسائط (مثل المصادقة)
│   ├── models/         # نماذج البيانات
│   └── utils/          # وظائف مساعدة
├── prisma/            # تعريفات قاعدة البيانات
└── src/index.ts       # نقطة الدخول
```

## 👥 أنواع المستخدمين والأدوار

### 1️⃣ **الموظف (Employee)**
- **الصلاحيات:**
  - عرض رصيد الإجازة السنوية (30 يوم)
  - تقديم طلبات إجازة سنوية
  - تقديم طلبات إجازة مرضية (مع ملف PDF)
  - عرض التقويم الشخصي للإجازات
  - طلب إلغاء إجازة معتمدة

### 2️⃣ **المشرف (Supervisor)**
- **الصلاحيات:**
  - إدارة موظفي الموقع (إضافة/حذف)
  - مراجعة طلبات الإجازة
  - الموافقة الأولية أو الرفض
  - عرض تقويم مجمع لموظفي الموقع
  - استخراج تقارير إحصائية

### 3️⃣ **رئيس القسم (Department Head)**
- **الصلاحيات:**
  - الاعتماد النهائي للإجازات
  - لوحة تحليلات شاملة
  - إدارة الهيكل الإداري
  - ترقية الموظفين لمشرفين
  - الرقابة على جميع السايتات

### 4️⃣ **المسؤول (Admin)**
- **الصلاحيات:**
  - إدارة النظام الكاملة
  - إضافة/حذف المستخدمين
  - إدارة الأدوار والصلاحيات
  - إعدادات النظام

## 🔐 نظام المصادقة والأمان

- **التشفير:** bcrypt للتعامل مع كلمات المرور
- **المصادقة:** JWT (JSON Web Token)
- **التفويض:** Role-Based Access Control (RBAC)
- **قاعدة البيانات:** PostgreSQL لضمان عدم فقدان البيانات

## 📦 نموذج قاعدة البيانات

```sql
-- المستخدمون
Users: { id, email, username, password, fullName, role, annualLeaveBalance }

-- المواقع
Sites: { id, name, location, supervisorId }

-- طلبات الإجازة
LeaveRequests: { id, startDate, endDate, leaveType, status, documentUrl }

-- المراجعات والموافقات
LeaveReviews: { id, leaveRequestId, reviewerId, comment, status }

-- السجلات التدقيقية
AuditLogs: { id, userId, action, timestamp }
```

## 🚀 البدء السريع

### المتطلبات
- Node.js >= 16
- PostgreSQL
- npm أو yarn

### تثبيت وتشغيل Backend

```bash
cd backend

# تثبيت المكتبات
npm install

# إعداد متغيرات البيئة
cp .env.example .env
# عدّل DATABASE_URL و JWT_SECRET

# تشغيل الهجرات
npm run prisma:migrate

# تشغيل الخادم
npm run dev
```

### تثبيت وتشغيل Frontend

```bash
cd frontend

# تثبيت المكتبات
npm install

# إعداد متغيرات البيئة
cp .env.local.example .env.local

# تشغيل الخادم التطويري
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في متصفحك.

## 📡 API Endpoints

### المصادقة
```
POST   /api/auth/register      # تسجيل مستخدم جديد
POST   /api/auth/login         # تسجيل الدخول
POST   /api/auth/reset-password/:userId  # إعادة تعيين كلمة المرور
```

### المستخدمون
```
GET    /api/users/profile      # الحصول على بيانات الملف الشخصي
PUT    /api/users/profile      # تحديث الملف الشخصي
GET    /api/users              # جميع المستخدمين (مسؤول/رئيس قسم)
GET    /api/users/site-employees  # موظفو الموقع (مشرف)
POST   /api/users/promote-supervisor  # ترقية لمشرف
PUT    /api/users/:userId/deactivate  # تعطيل المستخدم
```

## 🎨 واجهة المستخدم

- **الوضع:** Light Mode (فاتح)
- **اللغات:** English و العربية (في المرحلة التالية)
- **الاستجابة:** Fully Responsive Design
- **سهولة الاستخدام:** Intuitive & User-Friendly

## 📊 الميزات القادمة

- [ ] نظام طلبات الإجازات المتقدم
- [ ] رفع الملفات الطبية (PDF)
- [ ] نظام التنبيهات والإشعارات
- [ ] لوحة تحكم رئيس القسم
- [ ] استخراج التقارير المتقدمة
- [ ] دعم لغة عربية كاملة
- [ ] تطبيق جوال

## 📝 الترخيص

هذا المشروع مرخص تحت MIT License.

## 👨‍💻 الدعم والمساهمة

للأسئلة والدعم، يرجى التواصل عبر البريد الإلكتروني أو فتح قضية جديدة في المشروع.

# 🗺️ خريطة المسارات الكاملة - LeaveFlow

## 📍 جميع نقاط النهاية (Endpoints) المتاحة

### 🔐 **قسم المصادقة** (`/api/auth`)

#### `POST /api/auth/register`
تسجيل مستخدم جديد في النظام.

**المدخلات (Body):**
```json
{
  "email": "user@example.com",
  "username": "username123",
  "password": "password123",
  "fullName": "محمد أحمد"
}
```

**الناتج (200):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "cuid123",
    "email": "user@example.com",
    "username": "username123",
    "fullName": "محمد أحمد",
    "role": "EMPLOYEE"
  }
}
```

---

#### `POST /api/auth/login`
تسجيل الدخول والحصول على JWT Token.

**المدخلات (Body):**
```json
{
  "username": "username123",
  "password": "password123"
}
```

**الناتج (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cuid123",
    "username": "username123",
    "email": "user@example.com",
    "fullName": "محمد أحمد",
    "role": "EMPLOYEE"
  }
}
```

**استخدام الـ Token:**
```
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### `POST /api/auth/reset-password/:userId`
إعادة تعيين كلمة المرور للمستخدم (محمي).

**المتطلبات:**
- تسجيل دخول مسؤول أو المستخدم نفسه

**المدخلات (Body):**
```json
{
  "newPassword": "newpassword123"
}
```

**الناتج (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

### 👤 **قسم المستخدمين** (`/api/users`)

#### `GET /api/users/profile`
الحصول على بيانات الملف الشخصي للمستخدم الحالي (محمي).

**الناتج (200):**
```json
{
  "user": {
    "id": "cuid123",
    "email": "user@example.com",
    "username": "username123",
    "fullName": "محمد أحمد",
    "role": "EMPLOYEE",
    "annualLeaveBalance": 30,
    "site": {
      "id": "site123",
      "name": "موقع ينبع",
      "location": "ينبع"
    }
  }
}
```

---

#### `PUT /api/users/profile`
تحديث بيانات الملف الشخصي (محمي).

**المدخلات (Body):**
```json
{
  "fullName": "محمد أحمد علي",
  "email": "newemail@example.com"
}
```

**الناتج (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "cuid123",
    "email": "newemail@example.com",
    "username": "username123",
    "fullName": "محمد أحمد علي",
    "role": "EMPLOYEE"
  }
}
```

---

#### `GET /api/users`
الحصول على جميع المستخدمين في النظام.

**المتطلبات:**
- دور: `ADMIN` أو `DEPARTMENT_HEAD`

**الناتج (200):**
```json
{
  "users": [
    {
      "id": "user123",
      "email": "user@example.com",
      "username": "user1",
      "fullName": "محمد أحمد",
      "role": "EMPLOYEE",
      "isActive": true,
      "site": {
        "id": "site123",
        "name": "موقع ينبع"
      }
    },
    {
      "id": "user456",
      "email": "supervisor@example.com",
      "username": "supervisor1",
      "fullName": "علي محمود",
      "role": "SUPERVISOR",
      "isActive": true,
      "site": {
        "id": "site123",
        "name": "موقع ينبع"
      }
    }
  ]
}
```

---

#### `GET /api/users/site-employees`
الحصول على موظفي الموقع الخاص بالمشرف (محمي).

**المتطلبات:**
- دور: `SUPERVISOR`

**الناتج (200):**
```json
{
  "users": [
    {
      "id": "user123",
      "email": "emp1@example.com",
      "username": "emp1",
      "fullName": "أحمد محمود",
      "role": "EMPLOYEE",
      "isActive": true,
      "annualLeaveBalance": 30
    },
    {
      "id": "user124",
      "email": "emp2@example.com",
      "username": "emp2",
      "fullName": "فاطمة علي",
      "role": "EMPLOYEE",
      "isActive": true,
      "annualLeaveBalance": 28
    }
  ]
}
```

---

#### `POST /api/users/promote-supervisor`
ترقية موظف لمشرف الموقع (محمي).

**المتطلبات:**
- دور: `ADMIN` أو `DEPARTMENT_HEAD`

**المدخلات (Body):**
```json
{
  "userId": "user123",
  "siteId": "site123"
}
```

**الناتج (200):**
```json
{
  "message": "User promoted to supervisor successfully"
}
```

---

#### `PUT /api/users/:userId/deactivate`
تعطيل حساب المستخدم (محمي).

**المتطلبات:**
- دور: `ADMIN` أو `DEPARTMENT_HEAD`

**الناتج (200):**
```json
{
  "message": "User deactivated successfully"
}
```

---

## 🔄 **سير العمل (Workflow)**

### **سيناريو 1: موظف جديد يسجل حسابه**

```
1. POST /api/auth/register
   ├── البيانات: email, username, password, fullName
   └── الناتج: User registered

2. POST /api/auth/login
   ├── البيانات: username, password
   └── الناتج: token + user data

3. GET /api/users/profile
   ├── Header: Authorization: Bearer {token}
   └── الناتج: User profile + leave balance
```

---

### **سيناريو 2: مسؤول يرقي موظف لمشرف**

```
1. POST /api/auth/login (كـ Admin)
   └── الناتج: admin token

2. GET /api/users (اختياري)
   ├── Header: Bearer {admin token}
   └── الناتج: قائمة جميع المستخدمين

3. POST /api/users/promote-supervisor
   ├── Header: Bearer {admin token}
   ├── Body: { userId, siteId }
   └── الناتج: Promoted successfully

4. GET /api/users/site-employees
   ├── Header: Bearer {supervisor token} (المشرف الجديد)
   └── الناتج: موظفو الموقع
```

---

### **سيناريو 3: تحديث بيانات شخصية**

```
1. POST /api/auth/login
   └── الناتج: token

2. PUT /api/users/profile
   ├── Header: Bearer {token}
   ├── Body: { fullName, email }
   └── الناتج: Updated profile
```

---

### **سيناريو 4: إعادة تعيين كلمة المرور**

```
1. POST /api/auth/login (كـ Admin)
   └── الناتج: admin token

2. POST /api/auth/reset-password/{userId}
   ├── Header: Bearer {admin token}
   ├── Body: { newPassword }
   └── الناتج: Password reset successfully
```

---

## 🔑 **الأدوار والصلاحيات**

### **EMPLOYEE (الموظف)**
```
✅ GET /api/users/profile
✅ PUT /api/users/profile
❌ GET /api/users (جميع المستخدمين)
❌ GET /api/users/site-employees
❌ POST /api/users/promote-supervisor
❌ PUT /api/users/:userId/deactivate
```

### **SUPERVISOR (المشرف)**
```
✅ GET /api/users/profile
✅ PUT /api/users/profile
❌ GET /api/users (جميع المستخدمين)
✅ GET /api/users/site-employees
❌ POST /api/users/promote-supervisor
❌ PUT /api/users/:userId/deactivate
```

### **DEPARTMENT_HEAD (رئيس القسم)**
```
✅ GET /api/users/profile
✅ PUT /api/users/profile
✅ GET /api/users (جميع المستخدمين)
❌ GET /api/users/site-employees
✅ POST /api/users/promote-supervisor
✅ PUT /api/users/:userId/deactivate
```

### **ADMIN (المسؤول)**
```
✅ جميع العمليات
✅ لا توجد قيود
```

---

## 📊 **رموز الخطأ الشائعة**

| الكود | المعنى | السبب |
|------|-------|-------|
| 400 | Bad Request | بيانات ناقصة أو خاطئة |
| 401 | Unauthorized | لم يتم تقديم token أو token غير صالح |
| 403 | Forbidden | صلاحيات غير كافية |
| 404 | Not Found | المورد غير موجود |
| 409 | Conflict | المستخدم موجود بالفعل |
| 500 | Server Error | خطأ في الخادم |

---

## 🔐 **ملخص الأمان**

```
🔒 كل نقطة نهاية محمية تتطلب:
  ├─ Token JWT صحيح
  ├─ دور صحيح (إن كان مطلوباً)
  └─ بيانات صحيحة في الـ Body

🔐 السجلات التدقيقية:
  └─ كل عملية دخول تُسجل في AuditLog
```

---

## 📝 **الخطوات التالية**

المرحلة التالية ستشمل:
- [ ] نقاط نهاية طلبات الإجازات
- [ ] نقاط نهاية الموافقات
- [ ] نقاط نهاية التقارير
- [ ] نقاط نهاية إدارة المواقع

---

**آخر تحديث:** الآن
**الإصدار:** v1.0.0

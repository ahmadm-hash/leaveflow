# اختبار API باستخدام cURL أو Postman

## نقاط النهاية الأساسية

### 1. تسجيل مستخدم جديد
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@example.com",
    "username": "employee1",
    "password": "password123",
    "fullName": "محمد أحمد"
  }'
```

### 2. تسجيل الدخول
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employee1",
    "password": "password123"
  }'
```

الرد سيحتوي على:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "employee1",
    "email": "employee@example.com",
    "fullName": "محمد أحمد",
    "role": "EMPLOYEE"
  }
}
```

### 3. الحصول على ملف المستخدم الشخصي
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. تحديث الملف الشخصي
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "fullName": "محمد أحمد علي",
    "email": "newemail@example.com"
  }'
```

### 5. ترقية موظف لمشرف
```bash
curl -X POST http://localhost:5000/api/users/promote-supervisor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userId": "user_id_here",
    "siteId": "site_id_here"
  }'
```

### 6. إعادة تعيين كلمة المرور
```bash
curl -X POST http://localhost:5000/api/auth/reset-password/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "newPassword": "newpassword123"
  }'
```

## الحالات الخاصة

### أخطاء المصادقة
- `401 Unauthorized`: لم يتم توفير token أو token غير صالح
- `403 Forbidden`: لا تملك صلاحيات كافية

### أخطاء المدخلات
- `400 Bad Request`: بيانات ناقصة أو غير صحيحة

### أخطاء الخادم
- `500 Internal Server Error`: خطأ في الخادم

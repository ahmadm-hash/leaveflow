# File Structure

High-level project structure:

```text
leaveflow/
  backend/
    prisma/
      schema.prisma
    src/
      controllers/
        authController.ts
        departmentController.ts
        leaveController.ts
        siteController.ts
        userController.ts
      middleware/
        auth.ts
      routes/
        authRoutes.ts
        departmentRoutes.ts
        leaveRoutes.ts
        siteRoutes.ts
        userRoutes.ts
      scripts/
        ensureDepartmentHead.ts
      utils/
        ensureDepartmentHeadUser.ts
        jwt.ts
        password.ts
      index.ts
    package.json
    tsconfig.json

  frontend/
    app/
      (auth)/
        login/page.tsx
        register/page.tsx
      components/
        Alert.tsx
        Card.tsx
        LeaveCalendar.tsx
        NavLink.tsx
        StatusBadge.tsx
      dashboard/
        home/page.tsx
        leaves/page.tsx
        leaves/new/page.tsx
        manage/page.tsx
        profile/page.tsx
        sites/page.tsx
        users/page.tsx
      lib/
        apiClient.ts
        authService.ts
        leaveService.ts
      store/
        authStore.ts
      layout.tsx
      page.tsx
    middleware.ts
    package.json
    tsconfig.json

  API_TESTING.md
  DEVELOPMENT.md
  ENDPOINTS_GUIDE.md
  FILE_STRUCTURE.md
  INDEX.md
  QUICK_REFERENCE.md
  QUICKSTART.md
  README.md
  START_HERE.txt
  TESTING.md
  TROUBLESHOOTING.md
  package.json
```

## Notes
- Backend route registration happens in backend/src/index.ts.
- Prisma schema is the source of truth for data models.
- Frontend API access flows through app/lib/apiClient.ts.
- Role-aware navigation is handled inside dashboard layout.

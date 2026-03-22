@echo off
REM LeaveFlow - Setup Script for Windows

echo.
echo 🚀 LeaveFlow Setup Script
echo ==========================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js ^>= 16
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

echo.
echo ✅ Backend and Frontend dependencies will be installed automatically
echo.

REM Create .env files
echo 🔧 Setting up environment files...

if not exist "backend\.env" (
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env (Please update DATABASE_URL and JWT_SECRET)
) else (
    echo ⏭️ backend\.env already exists
)

if not exist "frontend\.env.local" (
    copy frontend\.env.local.example frontend\.env.local
    echo ✅ Created frontend\.env.local
) else (
    echo ⏭️ frontend\.env.local already exists
)

echo.
echo 🎉 Setup Complete!
echo.
echo 📋 Next Steps:
echo 1. Update DATABASE_URL in backend\.env
echo 2. Run: npm run prisma:migrate --workspace=backend
echo 3. Run: npm run dev --workspace=backend (in one terminal)
echo 4. Run: npm run dev --workspace=frontend (in another terminal)
echo.
echo 🌐 Access the app at: http://localhost:3000
echo.
pause

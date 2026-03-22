#!/bin/bash
# LeaveFlow - Setup Script

echo "🚀 LeaveFlow Setup Script"
echo "=========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 16"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

echo ""
echo "✅ Backend and Frontend dependencies will be installed automatically"
echo ""

# Create .env files
echo "🔧 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env (Please update DATABASE_URL and JWT_SECRET)"
else
    echo "⏭️  backend/.env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
else
    echo "⏭️  frontend/.env.local already exists"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update DATABASE_URL in backend/.env"
echo "2. Run: npm run prisma:migrate --workspace=backend"
echo "3. Run: npm run dev --workspace=backend (in one terminal)"
echo "4. Run: npm run dev --workspace=frontend (in another terminal)"
echo ""
echo "🌐 Access the app at: http://localhost:3000"
echo ""

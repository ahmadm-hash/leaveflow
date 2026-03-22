# LeaveFlow - Leave Management System

## Backend Setup

### Prerequisites
- Node.js >= 16
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL database URL and JWT secret.

3. Run Prisma migrations:
```bash
npm run prisma:migrate
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

### Database Studio
To view and manage your database:
```bash
npm run prisma:studio
```

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/reset-password/:userId` - Reset password (protected)

### Users
- `GET /api/users/profile` - Get current user profile (protected)
- `PUT /api/users/profile` - Update profile (protected)
- `GET /api/users` - Get all users (Admin/Department Head)
- `GET /api/users/site-employees` - Get site employees (Supervisor)
- `POST /api/users/promote-supervisor` - Promote user (Admin/Department Head)
- `PUT /api/users/:userId/deactivate` - Deactivate user (Admin/Department Head)

## User Roles

1. **Employee** - Can request and manage their leaves
2. **Supervisor** - Manages employees and approves leaves
3. **Department Head** - Final approval authority
4. **Admin** - System administrator

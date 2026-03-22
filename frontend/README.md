# LeaveFlow Frontend

Modern leave management system frontend built with Next.js and React.

## Features
- User Authentication (Login/Register)
- Role-Based Access Control
- User Dashboard
- Profile Management
- Responsive Design (Light Mode)

## Getting Started

### Prerequisites
- Node.js >= 16
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Update `NEXT_PUBLIC_API_URL` to match your backend URL.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── (auth)/           # Authentication pages
│   ├── login/
│   └── register/
├── dashboard/        # Protected dashboard pages
├── components/       # Reusable components
├── store/           # Zustand state management
├── lib/             # Utility functions
└── page.tsx         # Root page
```

## State Management

We use Zustand for state management. Auth state is persisted in localStorage.

### Auth Store

```typescript
useAuthStore.getState().login(user, token)
useAuthStore.getState().logout()
useAuthStore.getState().setUser(user)
```

## API Integration

API client is auto-initialized with axios and handles:
- Token attachment to requests
- Error handling
- Auto-logout on 401 responses

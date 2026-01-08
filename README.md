# SaaS Attendance Management System
# Complete Build & Run Instructions

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- npm or pnpm

## Quick Start

### 1. Install Dependencies

```bash
# From root directory
npm install
```

### 2. Set Up Database

```bash
# Copy environment file
cd apps/api
cp .env.example .env

# Update .env with your database credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/attendance_db"
# JWT_SECRET="your-super-secret-key-min-32-chars"
# JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Seed the database with demo data
npx prisma db seed
```

### 3. Start the Servers

```bash
# Terminal 1 - Start API (port 3001)
cd apps/api
npm run start:dev

# Terminal 2 - Start Frontend (port 3000)
cd apps/web
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Swagger Docs**: http://localhost:3001/api/docs
- **API Health**: http://localhost:3001/api/v1/health

### Demo Credentials

- **Admin**: admin@demo.com / Demo@123!
- **Employee**: john.doe@demo.com / Demo@123!

---

## Project Structure

```
attendance/
├── apps/
│   ├── api/               # NestJS Backend
│   │   ├── prisma/        # Database schema & migrations
│   │   └── src/
│   │       ├── common/    # Shared utilities, filters, interceptors
│   │       └── modules/   # Feature modules
│   └── web/               # Next.js Frontend
│       └── src/
│           ├── app/       # Pages (App Router)
│           ├── components/# React components
│           └── lib/       # API clients, stores, utils
├── ARCHITECTURE.md        # System architecture documentation
└── README.md              # This file
```

## Features

### Core Features
- ✅ Multi-tenant architecture
- ✅ JWT authentication with refresh tokens
- ✅ Two-factor authentication (TOTP)
- ✅ Email verification & password reset
- ✅ Role-based access control

### Attendance Management
- ✅ Check-in/Check-out with GPS tracking
- ✅ Break tracking
- ✅ Manual entry & corrections
- ✅ Approval workflow
- ✅ Attendance history & reports

### Leave Management
- ✅ Multiple leave types
- ✅ Leave request & approval workflow
- ✅ Leave balance tracking
- ✅ Holiday calendar

### Organization Management
- ✅ Departments & designations
- ✅ Shift management
- ✅ Employee profiles

### Subscription & Billing
- ✅ Stripe integration
- ✅ Multiple subscription plans
- ✅ Usage limits & feature gates
- ✅ Invoice history

### Reports & Analytics
- ✅ Attendance reports
- ✅ Department analytics
- ✅ Payroll summaries
- ✅ Export to CSV/Excel

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new company
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/2fa/enable` - Enable 2FA

### Attendance
- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance/today` - Today's status
- `GET /api/v1/attendance/my-history` - Personal history
- `GET /api/v1/attendance/dashboard` - Dashboard stats

### Employees
- `GET /api/v1/employees` - List employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees/:id` - Get employee
- `PUT /api/v1/employees/:id` - Update employee

### Leaves
- `GET /api/v1/leaves` - List leave requests
- `POST /api/v1/leaves` - Request leave
- `PUT /api/v1/leaves/:id/approve` - Approve leave
- `PUT /api/v1/leaves/:id/reject` - Reject leave

### Subscription
- `GET /api/v1/subscription` - Current subscription
- `GET /api/v1/subscription/plans` - Available plans
- `POST /api/v1/subscription/checkout` - Start checkout
- `POST /api/v1/subscription/portal` - Billing portal

## Tech Stack

### Backend
- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15 + Prisma ORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Components**: Radix UI primitives
- **Charts**: Recharts

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/attendance
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
BCRYPT_SALT_ROUNDS=12
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=/api/v1
```

## License

MIT License

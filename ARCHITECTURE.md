# SaaS Attendance Management System - Architecture Document

## System Overview

A multi-tenant, subscription-based SaaS platform for corporate attendance management, designed for scalability, security, and enterprise-grade performance.

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10 (TypeScript)
- **ORM**: Prisma 5
- **Database**: PostgreSQL 15
- **Cache**: Redis (for sessions, rate limiting)
- **Queue**: Bull (for background jobs)
- **Email**: Nodemailer with SendGrid/SMTP

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Date Handling**: date-fns

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt
- **Monitoring**: Winston (logging), Prometheus (metrics)

---

## Multi-Tenant Architecture

### Tenant Isolation Strategy
- **Database Level**: All tables include `companyId` foreign key
- **Application Level**: Middleware enforces tenant context
- **API Level**: JWT tokens contain tenant identifier

### Data Flow
```
Request → API Gateway → Auth Middleware → Tenant Context → Business Logic → Database
```

---

## Database Schema Overview

### Core Entities
1. **companies** - Tenant organizations
2. **users** - System users (all roles)
3. **employees** - Employee profiles
4. **departments** - Organizational units
5. **designations** - Job titles
6. **shifts** - Work schedules
7. **attendance_records** - Check-in/out logs
8. **leaves** - Leave requests
9. **leave_types** - Leave categories
10. **holidays** - Company holidays
11. **subscriptions** - Active plans
12. **plans** - Available subscription tiers
13. **payments** - Payment history
14. **audit_logs** - System activity logs

---

## API Structure

### Authentication Endpoints
```
POST   /api/auth/register          - Company registration
POST   /api/auth/login             - User login
POST   /api/auth/refresh           - Refresh tokens
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password
POST   /api/auth/verify-email      - Email verification
POST   /api/auth/enable-2fa        - Enable 2FA
POST   /api/auth/verify-2fa        - Verify 2FA code
POST   /api/auth/logout            - Logout
```

### Company Management
```
GET    /api/company                - Get company details
PUT    /api/company                - Update company
GET    /api/company/settings       - Get settings
PUT    /api/company/settings       - Update settings
```

### Employee Management
```
GET    /api/employees              - List employees
POST   /api/employees              - Create employee
GET    /api/employees/:id          - Get employee
PUT    /api/employees/:id          - Update employee
DELETE /api/employees/:id          - Deactivate employee
GET    /api/employees/:id/attendance - Employee attendance history
GET    /api/employees/:id/leaves   - Employee leave history
```

### Department Management
```
GET    /api/departments            - List departments
POST   /api/departments            - Create department
PUT    /api/departments/:id        - Update department
DELETE /api/departments/:id        - Delete department
```

### Attendance
```
POST   /api/attendance/check-in    - Check in
POST   /api/attendance/check-out   - Check out
GET    /api/attendance/today       - Today's attendance
GET    /api/attendance/history     - Attendance history
POST   /api/attendance/manual      - Manual entry (HR only)
PUT    /api/attendance/:id/approve - Approve attendance
PUT    /api/attendance/:id/lock    - Lock attendance record
```

### Leave Management
```
GET    /api/leaves                 - List leaves
POST   /api/leaves                 - Request leave
GET    /api/leaves/:id             - Get leave details
PUT    /api/leaves/:id/approve     - Approve leave
PUT    /api/leaves/:id/reject      - Reject leave
GET    /api/leave-types            - List leave types
POST   /api/leave-types            - Create leave type
GET    /api/holidays               - List holidays
POST   /api/holidays               - Create holiday
```

### Shifts
```
GET    /api/shifts                 - List shifts
POST   /api/shifts                 - Create shift
PUT    /api/shifts/:id             - Update shift
DELETE /api/shifts/:id             - Delete shift
POST   /api/shifts/assign          - Assign shift to employees
```

### Reports
```
GET    /api/reports/attendance     - Attendance reports
GET    /api/reports/leave          - Leave reports
GET    /api/reports/department     - Department reports
GET    /api/reports/payroll        - Payroll summary
GET    /api/reports/analytics      - Analytics data
POST   /api/reports/export         - Export report
```

### Subscription & Billing
```
GET    /api/subscription           - Get current subscription
POST   /api/subscription/checkout  - Create checkout session
POST   /api/subscription/portal    - Customer portal session
GET    /api/billing/invoices       - List invoices
GET    /api/billing/history        - Payment history
POST   /api/webhooks/stripe        - Stripe webhooks
```

---

## Security Measures

### Authentication
- JWT with short-lived access tokens (15 min)
- HTTP-only refresh tokens (7 days)
- Bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Account lockout after failed attempts

### Data Protection
- All data encrypted at rest
- TLS 1.3 for data in transit
- Prepared statements (SQL injection prevention)
- Input sanitization (XSS prevention)
- CSRF tokens for state-changing operations

### Multi-Tenant Security
- Row-level security policies
- Tenant ID verification on every request
- Separate encryption keys per tenant
- Audit logging for sensitive operations

---

## Subscription Plans

### Starter ($29/month or $290/year)
- Up to 25 employees
- Basic attendance tracking
- Leave management
- Email support
- Basic reports

### Professional ($79/month or $790/year)
- Up to 100 employees
- All Starter features
- GPS tracking
- Shift management
- Advanced reports
- API access
- Priority support

### Enterprise ($199/month or $1990/year)
- Unlimited employees
- All Professional features
- Custom integrations
- Dedicated support
- SLA guarantee
- White-label option
- On-premise deployment option

---

## Deployment Architecture

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │     Nginx       │
                    │  (Load Balancer)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌────────┴────────┐ ┌────────┴────────┐
│  Frontend App   │ │  Backend API    │ │  Backend API    │
│  (Next.js)      │ │  (NestJS #1)    │ │  (NestJS #2)    │
└─────────────────┘ └────────┬────────┘ └────────┬────────┘
                             │                   │
                    ┌────────┴───────────────────┴────────┐
                    │                                      │
              ┌─────┴─────┐                         ┌──────┴──────┐
              │ PostgreSQL│                         │    Redis    │
              │  Primary  │                         │   Cluster   │
              └─────┬─────┘                         └─────────────┘
                    │
              ┌─────┴─────┐
              │ PostgreSQL│
              │  Replica  │
              └───────────┘
```

---

## Frontend Structure

```
/app
  /(auth)
    /login
    /register
    /forgot-password
    /reset-password
    /verify-email
  /(dashboard)
    /dashboard
    /attendance
    /employees
    /departments
    /leaves
    /shifts
    /holidays
    /reports
    /settings
    /billing
  /api
/components
  /ui (reusable components)
  /forms
  /tables
  /charts
  /layout
/lib
  /api (API client)
  /auth (auth utilities)
  /utils (helpers)
  /hooks (custom hooks)
  /stores (Zustand stores)
/types
/styles
```

---

## Performance Optimizations

1. **Database**: Indexed queries, connection pooling, read replicas
2. **Caching**: Redis for frequently accessed data
3. **Frontend**: Static generation, image optimization, code splitting
4. **API**: Response compression, pagination, field selection
5. **Background Jobs**: Queue for heavy operations (reports, emails)

---

## Monitoring & Observability

1. **Logging**: Structured JSON logs with Winston
2. **Metrics**: Prometheus + Grafana
3. **Tracing**: OpenTelemetry
4. **Alerting**: PagerDuty/Slack integration
5. **Error Tracking**: Sentry

---

## Compliance Considerations

- GDPR compliance (data export, deletion)
- SOC 2 Type II ready architecture
- Data retention policies
- Audit trail for all operations
- Role-based access control

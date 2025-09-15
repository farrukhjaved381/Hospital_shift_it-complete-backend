# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Hospital Management System API** backend built with **NestJS** and **TypeScript**. The system manages multi-tenant organizations (hospitals and schools) with role-based authentication, designed to handle scheduling, compliance, and billing workflows.

The platform facilitates clinical rotations by connecting medical schools with hospitals, managing student assignments, ensuring compliance documentation, handling subscription billing via Stripe, and providing communication tools for all stakeholders.

## Core Architecture

### NestJS Module Structure
The application follows NestJS's modular architecture with clear separation of concerns:

- **Auth Module** (`src/auth/`): Complete JWT-based authentication with access/refresh tokens, role-based access control, and user management
- **Users Module** (`src/users/`): User CRUD operations and profile management  
- **Prisma Module** (`src/prisma/`): Database service layer with PostgreSQL via Prisma ORM
- **App Module** (`src/app.module.ts`): Root module orchestrating all feature modules

### Database Design (Multi-tenant)
The database schema supports multi-organizational architecture:

```typescript path=null start=null
// Core entities and relationships:
User ←→ Membership ←→ Organization
User ←→ RefreshToken

// Role hierarchy:
SUPER_ADMIN > HOSPITAL_ADMIN/SCHOOL_ADMIN > STUDENT

// Organization types:  
HOSPITAL | SCHOOL
```

Key architectural decisions:
- **CUID-based IDs** for better distributed system support
- **Soft deletion** via `isActive` flags  
- **Role-based multi-tenancy** through Membership junction table
- **Secure token management** with separate refresh token storage

### Authentication Flow
The system implements a sophisticated JWT authentication pattern:

1. **Registration/Login** → Access token (15min) + Refresh token (7 days)
2. **API Access** → JWT Guard validates access token + extracts user context
3. **Token Refresh** → Refresh token exchange for new access token pair
4. **Role Authorization** → Guard checks user roles against route requirements

## Essential Development Commands

### Database Operations
```bash
# View and manage data in browser UI
npm run prisma:studio

# Push schema changes to database (development)  
npm run prisma:push

# Regenerate Prisma client after schema changes
npm run prisma:generate

# Generate and apply migrations (production)
npx prisma migrate dev --name your_migration_name
npx prisma migrate deploy
```

### Development Workflow
```bash
# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Debug mode with inspector
npm run start:debug
```

### Testing & Quality
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch  

# Generate test coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Lint and fix code
npm run lint

# Format code with Prettier
npm run format
```

### Single Test Execution
```bash
# Run specific test file
npm test -- auth.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should register user"

# Run tests for specific module
npm test -- src/auth/
```

## API Documentation & Testing

The application auto-generates Swagger documentation at `http://localhost:3001/api` with:
- Interactive API testing interface
- JWT Bearer authentication support
- Request/response schemas and examples
- Role-based endpoint documentation

Test the authentication flow:
```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hospital.com","username":"testuser","password":"password123","firstName":"John","lastName":"Doe","role":"STUDENT"}'

# Login user
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"test@hospital.com","password":"password123"}'
```

## Key Configuration Files

- **`prisma/schema.prisma`**: Database schema with multi-tenant user/organization relationships
- **`src/main.ts`**: Application bootstrap with CORS, validation pipes, and Swagger setup  
- **`.env`**: Environment variables including `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- **`nest-cli.json`**: NestJS CLI configuration for build and development

## Important Development Context

### Environment Setup
- **Database**: Neon PostgreSQL (cloud-hosted, production-ready)
- **Port**: Application runs on port 3001 by default
- **CORS**: Enabled for all origins in development
- **Validation**: Global validation pipes with DTO transformation

### Security Considerations  
- **Password hashing**: bcryptjs with 12 salt rounds
- **Token security**: Separate access (short-lived) and refresh (longer-lived) tokens
- **Role-based access**: Guards enforce role hierarchies on protected routes
- **Input validation**: Class-validator DTOs prevent malicious input

### Code Organization Patterns
- **DTOs**: Located in each module for request/response validation
- **Guards**: JWT authentication and role-based authorization
- **Services**: Business logic separated from controllers
- **Interfaces**: TypeScript interfaces for type safety
- **Helpers**: Utility classes like `TokenHelpers` for reusable functionality

### Database Relationship Patterns
When working with the multi-tenant architecture:
- Users can belong to multiple organizations via Memberships
- Each membership has its own role assignment
- Use Prisma's `include` or `select` to fetch related data efficiently
- Always filter by active status (`isActive: true`) unless specifically needed

### Common Gotchas
- Prisma client generation required after schema changes (`npm run prisma:generate`)
- Database URL must include `--data-proxy` flag for Neon DB compatibility
- JWT tokens require proper Bearer prefix in Authorization headers
- Role guards check both authentication and authorization - ensure proper imports
- Refresh tokens are single-use and generate new token pairs on each refresh

## Project Flow & Business Logic

### Complete User Journey
The system orchestrates complex interactions between multiple stakeholders:

1. **User & Organization Setup**
   - SuperAdmin creates Hospitals and Schools (or approves onboarding requests)
   - Hospital Admins and School Admins are invited and onboard their organizations
   - Students register → School Admins enroll them

2. **Payments & Billing**
   - Schools/Hospitals subscribe via Stripe (plans or per-student billing)
   - Stripe webhooks confirm payments → unlock features (student slots, shift capacity)

3. **Scheduling**
   - SuperAdmin/Hospital Admin sets up Departments, Clinical Sites, Shift Patterns
   - Schools propose Rotations with hospitals → SuperAdmin/Hospital approves
   - System generates Shifts based on patterns
   - Students are assigned (manually or auto) → must have required compliance docs

4. **Compliance**
   - Students upload required documents (vaccination, TB test, HIPAA, etc.)
   - Hospital Admins verify documents
   - Only compliant students can be assigned shifts

5. **Execution & Monitoring**
   - Students view their shift schedule
   - Schools/Hospitals monitor attendance & reports
   - SuperAdmin sees global analytics

6. **Communication**
   - In-app chat (school ↔ hospital ↔ students)
   - Notifications (new shifts, approvals, payment reminders)

### Example Workflow
```
SuperAdmin creates "City Hospital" & "Medical School A"
↓
Hospital Admin sets up Cardiology Dept + Site A
↓
School Admin subscribes via Stripe → unlocks 100 student slots
↓
School Admin enrolls 50 students → students upload docs
↓
Hospital Admin approves docs → students become eligible
↓
Hospital Admin sets up rotation for Cardiology Dept (Sept 1–Sept 30, 10 slots)
↓
System generates shifts → students get assigned
↓
Students view shifts on dashboard → confirm attendance
↓
Students chat with school/hospital admins if issues
↓
SuperAdmin monitors: payments, rotations, compliance, shift coverage
```

## Development Phases

### Phase 1 – Foundation ✅ (Current)
- ✅ NestJS project setup (Auth, RBAC, Prisma, Swagger)
- ✅ Database schema: Users, Organizations, Memberships, Roles
- ✅ Basic Auth (JWT login, refresh)
- 🔄 SuperAdmin dashboard: create Schools/Hospitals, invite admins
- ✅ Postman + Swagger testing

### Phase 2 – Payments & Subscriptions
- Stripe integration: subscription plans (per student/school)
- BillingAccount table + webhooks (invoice.paid, checkout.session.completed)
- SuperAdmin sees billing status of Schools/Hospitals
- Unlock org features after payment success

### Phase 3 – Scheduling Core
- Hospital Admin creates Departments, Sites, Shift Patterns
- School proposes Rotations → Hospital approves
- Generate Shifts under rotations
- API for assigning students to shifts
- Guard: only compliant (docs) students can be assigned

### Phase 4 – Student Enrollment & Compliance
- Student onboarding → School enrolls them
- Student uploads documents
- Hospital Admin verifies docs
- Enforcement: assignment blocked if docs invalid/expired

### Phase 5 – Communication & Notifications
- WebSocket Chat (conversations, messages)
- Notifications (in-app, email)
- Student → School → Hospital chat flows

### Phase 6 – Reports & Analytics
- SuperAdmin: overall stats (students, shifts, payments)
- Hospital: shift coverage, department load
- School: student participation, compliance status

### Phase 7 – Polish & Scale
- Role-based access refinements
- Security (rate limiting, logging, audit logs)
- Queue system (BullMQ for shift auto-assignments, Stripe retries, reminders)
- Testing (unit + integration)

## Extended Database Schema (Future)

Beyond the current User/Organization/Membership foundation, the system will expand to include:

```typescript path=null start=null
// Billing & Subscriptions
BillingAccount → SubscriptionPlan → PaymentHistory

// Clinical Structure
Hospital → Department → ClinicalSite
ShiftPattern → Shift → StudentAssignment

// Academic Structure
School → Program → Student → ComplianceDocument
RotationProposal → ApprovedRotation → Shift

// Communication
Conversation → Message → Participant
Notification → NotificationTemplate

// Compliance & Documents
DocumentType → ComplianceDocument → VerificationStatus
ComplianceRule → StudentComplianceStatus
```

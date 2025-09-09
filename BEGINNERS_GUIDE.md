# 🏥 Hospital Project - Complete Beginner's Guide

## 📚 **What is this project?**
This is a **Hospital-School Management System** built with **NestJS** (backend framework) and **Prisma** (database tool). It manages student clinical rotations, user authentication, and role-based access.

---

## 🧩 **Understanding the Tech Stack**

### **1. NestJS - The Backend Framework**
Think of NestJS like the "brain" of your application. It's built on Node.js and uses TypeScript.

**Key Concepts:**
- **Modules**: Like folders that group related code
- **Controllers**: Handle incoming requests (like API endpoints)  
- **Services**: Contain business logic (the actual work)
- **Guards**: Protect routes (like security guards)

### **2. Prisma - The Database Tool**
Prisma is like a "translator" between your code and the database.

**Key Concepts:**
- **Schema**: Defines your database structure (like a blueprint)
- **Client**: Auto-generated code to talk to the database
- **Migrations**: Version control for database changes

---

## 📁 **Project Structure Explained**

\`\`\`
hospital-project/
├── src/                          # All your source code
│   ├── auth/                     # Authentication stuff
│   │   ├── dto/                  # Data shapes for API
│   │   ├── interfaces/           # TypeScript types
│   │   ├── auth.controller.ts    # API endpoints (/auth/login, etc.)
│   │   ├── auth.service.ts       # Login/register logic
│   │   ├── auth.module.ts        # Groups auth components
│   │   └── guards/               # Route protection
│   ├── users/                    # User management
│   │   ├── dto/                  # User data shapes
│   │   ├── user.entity.ts        # User model
│   │   ├── user.service.ts       # User business logic
│   │   ├── user.controller.ts    # User API endpoints
│   │   └── user.module.ts        # Groups user components
│   ├── prisma/                   # Database connection
│   │   ├── prisma.service.ts     # Database client
│   │   └── prisma.module.ts      # Database module
│   ├── app.module.ts             # Main app configuration
│   └── main.ts                   # App startup file
├── prisma/                       # Database configuration
│   └── schema.prisma             # Database structure
├── generated/                    # Auto-created by Prisma
├── .env                          # Environment variables
└── package.json                  # Dependencies
\`\`\`

---

## 🔄 **How Data Flows Through Your App**

### **1. Request comes in**
\`\`\`
User -> API Call -> Controller -> Service -> Database -> Response
\`\`\`

### **2. Example: User Login**
1. **User** sends POST to `/auth/login`
2. **Controller** receives the request
3. **Service** validates credentials
4. **Prisma** queries database
5. **Response** sent back with JWT token

---

## 🗄️ **Database Structure (Prisma Schema)**

Your database has these tables:

### **Users Table**
\`\`\`typescript
model User {
  id          String   # Unique ID
  email       String   # Email (unique)
  username    String   # Username (unique)
  password    String   # Hashed password
  firstName   String   # First name
  lastName    String   # Last name
  role        Role     # STUDENT, ADMIN, etc.
  isActive    Boolean  # Active/inactive
  createdAt   DateTime # When created
  updatedAt   DateTime # Last updated
}
\`\`\`

### **Organizations Table** (Hospitals & Schools)
\`\`\`typescript
model Organization {
  id      String           # Unique ID
  name    String           # Organization name
  type    OrganizationType # HOSPITAL or SCHOOL
  // ... other fields
}
\`\`\`

### **Memberships Table** (Users belong to Organizations)
\`\`\`typescript
model Membership {
  userId         String # Links to User
  organizationId String # Links to Organization
  role           Role   # User's role in this org
}
\`\`\`

---

## 🔐 **Authentication Flow Explained**

### **Step 1: Registration**
\`\`\`javascript
POST /auth/register
{
  "email": "student@school.com",
  "username": "student123",
  "password": "securepass",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"
}
\`\`\`

### **What happens internally:**
1. Data validated (email format, password length, etc.)
2. Password encrypted with bcrypt
3. User saved to database
4. JWT tokens created (access + refresh)
5. Response sent back

### **Step 2: Login**
\`\`\`javascript
POST /auth/login
{
  "emailOrUsername": "student@school.com", // Can be email OR username
  "password": "securepass"
}
\`\`\`

### **What happens internally:**
1. Find user by email OR username
2. Compare provided password with stored hash
3. If valid, create JWT tokens
4. Send tokens back to user

---

## 🛡️ **Security & Protection**

### **1. Password Security**
- Passwords are **hashed** (not stored as plain text)
- Uses **bcrypt** with 12 salt rounds

### **2. JWT Tokens**
- **Access Token**: Short-lived (15 minutes) for API calls
- **Refresh Token**: Long-lived (7 days) to get new access tokens

### **3. Route Protection**
- **Guards** check if user is logged in
- **Role-based access** restricts features by user type

---

## 🚀 **API Endpoints You Have**

### **Authentication Endpoints**
\`\`\`
POST /auth/register    # Create account
POST /auth/login       # Log in
POST /auth/refresh     # Get new tokens
POST /auth/logout      # Log out
POST /auth/profile     # Get current user info
\`\`\`

### **User Management Endpoints**
\`\`\`
POST /users           # Create user (admin only)
GET /users            # List all users (admin only)  
GET /users/:id        # Get one user
PATCH /users/:id      # Update user (admin only)
DELETE /users/:id     # Delete user (admin only)
\`\`\`

---

## 🔧 **Important Files Explained**

### **1. main.ts** - App Startup
\`\`\`typescript
// This file starts your entire application
// Sets up Swagger documentation
// Configures CORS, validation, etc.
\`\`\`

### **2. app.module.ts** - Main Configuration
\`\`\`typescript
// Imports all other modules
// Configures global settings
// Think of it as the "master control"
\`\`\`

### **3. prisma/schema.prisma** - Database Blueprint
\`\`\`prisma
// Defines all your database tables
// Relationships between tables
// Data types and constraints
\`\`\`

### **4. .env** - Secret Configuration
\`\`\`bash
# Database connection
# JWT secrets
# App settings
# NEVER commit this file to git!
\`\`\`

---

## 🎯 **User Roles & Permissions**

### **SUPER_ADMIN**
- Can do everything
- Creates hospitals and schools
- Manages all users

### **HOSPITAL_ADMIN**  
- Manages their hospital
- Verifies student documents
- Creates departments and shifts

### **SCHOOL_ADMIN**
- Manages their school
- Enrolls students
- Creates rotation requests

### **STUDENT**
- Views their schedule
- Uploads documents
- Basic profile management

---

## 🚦 **How to Run the Project**

### **1. Start the Development Server**
\`\`\`bash
npm run start:dev
\`\`\`

### **2. View API Documentation**
Open: `http://localhost:3001/api`

### **3. Test Endpoints**
Use Postman, curl, or the Swagger UI

---

## 📈 **Future Features (Not Yet Built)**

1. **Stripe Payment Integration**
2. **Scheduling System**
3. **Document Upload/Verification**
4. **Real-time Chat**
5. **Analytics Dashboard**
6. **Email Notifications**

---

## 🤔 **Common Questions**

### **Q: What is the generated/ folder?**
A: It's auto-created by Prisma. Contains database client code. You can delete it - it regenerates automatically.

### **Q: Why use JWT tokens?**
A: They're stateless, secure, and work great for APIs. No need to store sessions on the server.

### **Q: What's the difference between Controller and Service?**
A: Controller handles HTTP requests/responses. Service contains business logic and database operations.

### **Q: How does role-based access work?**
A: Guards check the user's role from their JWT token and allow/deny access to endpoints.

---

## 🎉 **You're Ready!**

Your project has:
✅ Complete authentication system
✅ User management with roles
✅ Database with relationships
✅ API documentation
✅ Security best practices

Start by exploring the Swagger documentation at `http://localhost:3001/api` to see all available endpoints!

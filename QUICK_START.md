# 🎯 **QUICK PROJECT OVERVIEW**

## 🏗️ **Your Project Structure (Clean & Simple)**

```
hospital-project/
├── 📁 src/
│   ├── 🔐 auth/           ← Login/Register stuff
│   ├── 👥 users/          ← User management
│   ├── 🗄️ prisma/         ← Database connection
│   ├── 📋 app.module.ts   ← Main app config
│   └── 🚀 main.ts         ← App startup
├── 🗄️ prisma/
│   └── schema.prisma      ← Database structure
├── ⚙️ .env               ← Your secrets
└── 📦 package.json       ← Dependencies
```

---

## 🔄 **How Your App Works (Simple Flow)**

### **1. App Starts** 
```
main.ts → app.module.ts → All modules loaded → Server running on port 3001
```

### **2. User Registers**
```
POST /auth/register → AuthController → AuthService → Database → JWT tokens
```

### **3. User Logs In**
```
POST /auth/login → Check password → Create tokens → Send back to user
```

### **4. Protected Route Access**
```
API call → JWT Guard checks token → If valid → Allow access → Return data
```

---

## 🎭 **The 4 Main Characters**

### **1. Controller** 🎮
- **Job**: Handle incoming requests
- **Example**: "Someone wants to login"
- **File**: `auth.controller.ts`

### **2. Service** 🧠
- **Job**: Do the actual work
- **Example**: "Check if password is correct"
- **File**: `auth.service.ts`

### **3. Module** 📦
- **Job**: Group related stuff together
- **Example**: "All auth-related code goes here"
- **File**: `auth.module.ts`

### **4. Prisma** 🗄️
- **Job**: Talk to the database
- **Example**: "Save this user" or "Find user by email"
- **File**: `prisma.service.ts`

---

## 🔐 **Authentication Made Simple**

### **What is JWT?**
Think of JWT like a **digital ID card**:
- Contains your user info
- Has an expiration date
- Cannot be faked (cryptographically signed)
- You show this ID to access protected areas

### **Two Types of Tokens:**
1. **Access Token** (15 min) - For API calls
2. **Refresh Token** (7 days) - To get new access tokens

---

## 🎯 **Your Database Tables**

### **Users** 👥
```
id, email, username, password, firstName, lastName, role
```

### **Organizations** 🏥🏫
```
id, name, type (HOSPITAL/SCHOOL)
```

### **Memberships** 🤝
```
Links users to organizations with specific roles
```

### **RefreshTokens** 🔄
```
Stores refresh tokens securely
```

---

## 🚀 **Getting Started Commands**

```bash
# Start development server
npm run start:dev

# View API documentation
http://localhost:3001/api

# Regenerate database client
npx prisma generate

# Reset database
npx prisma migrate reset
```

---

## 📝 **Test Your API**

### **Register a User:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "STUDENT"
  }'
```

### **Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "test@example.com",
    "password": "password123"
  }'
```

---

## 🎉 **You Now Know:**

✅ **What NestJS is** - A Node.js framework for building APIs
✅ **What Prisma is** - A database toolkit
✅ **How authentication works** - JWT tokens for security  
✅ **Project structure** - Where everything is located
✅ **How data flows** - Request → Controller → Service → Database
✅ **User roles** - Different permissions for different users

**Next Step**: Start the server and explore the Swagger documentation! 🚀

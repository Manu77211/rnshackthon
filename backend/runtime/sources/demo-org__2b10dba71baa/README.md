# Zorvyn Finance Backend API

Production-style backend API for finance operations, built with Node.js and Express, secured with JWT authentication and role-based access control (RBAC), and migrated from MongoDB/Mongoose to Neon PostgreSQL using parameterized SQL.

## Executive Summary

This project demonstrates:

- Secure authentication and authorization across multiple user roles.
- Backend architecture with clear route/controller/middleware/validator separation.
- Migration from document-based persistence to relational PostgreSQL schema design.
- Real API validation using terminal-driven requests and direct Neon database verification.

## Core Features

- JWT-based auth (`register`, `login`) with inactive-user access blocking.
- Role-based permissions for `viewer`, `analyst`, and `admin`.
- Full CRUD for financial records with validation and pagination.
- Dashboard analytics endpoints for summary, category breakdown, trends, and recent activity.
- Consistent API error contract:

```json
{
  "error": "ValidationError",
  "code": 400,
  "detail": "Amount must be greater than 0"
}
```

## Tech Stack

- Runtime: Node.js
- Framework: Express.js
- Database: Neon PostgreSQL
- DB client: `pg` (parameterized queries only)
- Auth: `jsonwebtoken`
- Password hashing: `bcryptjs`
- Validation: `express-validator`
- Config: `dotenv`
- Logging: `morgan` (optional)

## Architecture

```text
src/
  config/
    db.js                 # pool, connectivity, schema init
  controllers/            # request handlers
  middleware/             # auth, RBAC, validation, error handling
  routes/                 # endpoint declarations
  validators/             # express-validator rules
  utils/
    generateToken.js
  app.js                  # app composition
  server.js               # startup/bootstrap
scripts/
  seedAdmin.js            # admin seeding utility
  runManualTests.js       # optional scripted API checks
```

## Data Model (PostgreSQL)

- `users`
  - `id`, `name`, `email`, `password_hash`, `role`, `status`, timestamps
- `financial_records`
  - `id`, `amount`, `type`, `category`, `record_date`, `description`, `created_by`, timestamps

Important note: finance entries are stored in `financial_records` (not `records`).

## Environment Variables

Create `.env` from `.env.example` and set:

```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:password@your-neon-host.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=replace_with_long_secret
JWT_EXPIRES_IN=1d
LOG_REQUESTS=true

# optional seed admin
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Local Run Instructions

1. Install dependencies:

```bash
npm install
```

2. Seed admin user (optional but recommended for testing):

```bash
npm run seed:admin
```

3. Start API server:

```bash
npm run dev
```

4. Health check:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{"status":"ok"}
```

## Authentication and Roles

### Roles

- `viewer`: dashboard read access only
- `analyst`: records read + dashboard read
- `admin`: full access (users + records + dashboard)

### Auth Flow

1. Register or login.
2. Receive JWT token.
3. Send token in protected requests:

```http
Authorization: Bearer <JWT_TOKEN>
```

## API Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Users (admin only)

- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Records

- `POST /api/records` (admin)
- `GET /api/records` (analyst, admin)
- `GET /api/records/:id` (analyst, admin)
- `PUT /api/records/:id` (admin)
- `DELETE /api/records/:id` (admin)

Supported filters on `GET /api/records`:

- `type=income|expense`
- `category=Salary`
- `startDate=YYYY-MM-DD`
- `endDate=YYYY-MM-DD`
- `page=1`
- `limit=10`

### Dashboard (viewer, analyst, admin)

- `GET /api/dashboard/summary`
- `GET /api/dashboard/category-breakdown`
- `GET /api/dashboard/recent`
- `GET /api/dashboard/monthly-trends`

## Recruiter-Friendly Validation Walkthrough

The sequence below demonstrates a full manual verification flow.

### 1) Login and get token

Linux/macOS:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Windows PowerShell-safe (`curl.exe` through `cmd`):

```powershell
cmd /c 'curl.exe -i -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"'
```

### 2) Create a financial record

```powershell
cmd /c 'curl.exe -i -X POST http://localhost:5000/api/records -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d "{\"amount\":2500,\"type\":\"income\",\"category\":\"Salary\",\"date\":\"2026-04-01\",\"description\":\"Monthly salary\"}"'
```

### 3) Verify via API

```powershell
cmd /c 'curl.exe -i -X GET "http://localhost:5000/api/records?page=1&limit=5" -H "Authorization: Bearer YOUR_TOKEN"'
```

### 4) Verify directly in Neon SQL editor

```sql
SELECT id, amount, type, category, record_date, description, created_by, created_at
FROM financial_records
ORDER BY id DESC;
```

This confirms persistence in the remote Neon database, not only at API layer.

## Windows cURL Note

PowerShell aliases `curl` to `Invoke-WebRequest`, which can break standard `-H`/`-d` syntax. Use one of these options:

- `cmd /c 'curl.exe ...'` (recommended)
- `Invoke-RestMethod` with PowerShell hashtable/body syntax

## Quality and Security Decisions

- Parameterized SQL used to reduce SQL injection risk.
- Input validation enforced before controller execution.
- JWT middleware protects private routes.
- RBAC middleware limits endpoint access by role.
- Centralized error format for consistent client-side handling.


## Available Scripts

- `npm run dev` - start server in development mode
- `npm run start` - start server in production mode
- `npm run seed:admin` - seed an admin user from `.env`
- `node scripts/runManualTests.js` - optional scripted API checks

## Outcome

This repository demonstrates an end-to-end backend implementation with security controls, data validation, role-based permissions, and verifiable cloud persistence against Neon PostgreSQL.
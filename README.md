# UNESCO World Heritage Centre

This repository contains a full-stack web application for browsing, searching, and managing UNESCO World Heritage data. The project combines a React frontend, an Express API, and a PostgreSQL database with role-based access control and audit-friendly admin workflows.

## What this project does

The app provides a portal to explore heritage-related data such as:

- heritage sites and their locations
- site managers and status reports
- funds, donations, and donor details
- member countries and committee members
- awards and related records

It includes both user-facing browsing features and admin tools for editing records and managing schema-level changes.

## Main features

- user and admin authentication with JWTs and refresh cookies
- protected routes and role-based access control
- browse and detail views for database resources
- search, filtering, sorting, and pagination
- analytics dashboard for summary statistics
- map view for sites with coordinates
- history and feed views for recent changes
- schema editor for admins to add, rename, or remove columns
- soft-delete support for records
- security middleware such as Helmet, CORS, rate limiting, and parameterized SQL queries

## Tech stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express
- Database: PostgreSQL with raw SQL via the pg driver
- Authentication: JSON Web Tokens and cookie-based refresh handling

## Project structure

```text
client/                 # React frontend
  src/
    api/                 # API client helpers
    components/          # shared UI components
    hooks/               # auth context and helpers
    pages/               # landing, login, dashboard, browse, search, map, history, feed, schema editor

server/                 # Express backend
  db/                    # schema and seed scripts
    init.js
    schema.sql
    seed.js
  src/
    app.js               # app factory and middleware setup
    server.js            # server entry point
    auth/                # auth routes and token handling
    config/              # environment and database config
    middleware/          # auth, role, and error handling
    modules/             # resource, history, feed, stats, and schema routes/services
    utils/               # CSV and error helpers
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL running locally or remotely
- An empty database for the application

Example:

```sql
CREATE DATABASE unesco_whc;
```

## Setup

1. Create a PostgreSQL database.
2. Create a file named `.env` inside the server folder with at least the following values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unesco_whc
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
CLIENT_ORIGIN=http://localhost:5173
```

3. Install dependencies:

```bash
cd client && npm install
cd ../server && npm install
```

4. Initialize the schema and seed demo data:

```bash
cd server
npm run db:init
npm run seed
```

5. Start the backend and frontend in separate terminals:

```bash
# terminal 1
cd server
npm run dev
```

```bash
# terminal 2
cd client
npm run dev
```

The frontend will run on http://localhost:5173 and the backend on http://localhost:4000.

## Demo accounts

The seed script creates these accounts:

- Admin: admin@whc.org / Admin@12345
- User: user@whc.org / User@12345

## API overview

The server exposes REST endpoints under `/api` for:

- authentication (`/api/auth`)
- resource listing and CRUD operations (`/api/:resource`)
- metadata (`/api/meta`)
- search and export
- history and audit views (`/api/history`)
- stats and dashboard data (`/api/stats`)
- schema editing (`/api/schema`)
- feed and watchlist endpoints (`/api/feed` and `/api/watch`)

## Notes

- The app uses a metadata-driven resource layer, so many CRUD flows are generated from the shared resource registry rather than hard-coded per table.
- Re-running the database initialization script resets the schema.
- Change the JWT secrets before using the app outside local development.

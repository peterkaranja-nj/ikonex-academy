# Ikonex Academy - Student Management System

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
</div>

<br />

A full-stack Student Management System built for Ikonex Academy. Features class stream management, student registration, subject allocation, score recording, automatic grading with the Kenyan KCSE scale, ranked results, and PDF report generation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Setup & Installation](#setup--installation)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Project Structure](#project-structure)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser Client                     │
│           Next.js 14 (App Router) + TypeScript      │
│      Tailwind CSS · Recharts · React Query           │
└──────────────────────┬──────────────────────────────┘
                       │ REST / HTTP
┌──────────────────────▼──────────────────────────────┐
│               Node.js / Express API                  │
│         TypeScript · Zod validation · PDFKit        │
│                  Helmet · Morgan                     │
└──────────────────────┬──────────────────────────────┘
                       │ pg pool
┌──────────────────────▼──────────────────────────────┐
│                   PostgreSQL 16                      │
│     Triggers · Views · Grading Scale · Seed Data    │
└─────────────────────────────────────────────────────┘
```

---

## Features

| Module            | Capabilities                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Dashboard**     | Real-time stats, enrollment charts, top performers, quick actions                             |
| **Class Streams** | Create/edit/delete Form 1A–4C streams, assign subjects, view enrolled students                |
| **Students**      | Register, edit, delete students; assign to streams; paginated search & filter                 |
| **Subjects**      | Create/manage subjects; mark compulsory/optional; assign to streams                           |
| **Assessments**   | Record scores per student/subject/exam type; bulk score-sheet entry; duplicate prevention     |
| **Results**       | Auto-calculated averages, KCSE grades, points, class rankings, subject positions              |
| **Reports**       | PDF individual report cards; PDF class ranking reports (single-page landscape); bulk download |
| **Notifications** | Bell dropdown alerting admin to in-progress assessments with missing student scores; auto-refreshes every 60 s |

---

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 15 (local install or managed cloud DB)

---

## Setup & Installation

### 1. Install dependencies

```bash
# From the project root
npm install

# Install backend and frontend dependencies
npm run install:all
```

### 2. Set up PostgreSQL

```bash
# Create the database
createdb ikonex_academy

# Or using psql
psql -U postgres -c "CREATE DATABASE ikonex_academy;"
```

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and other variables

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — set NEXT_PUBLIC_API_URL
```

### 4. Run migrations and seed

```bash
npm run db:migrate    # Creates all tables and views
npm run db:seed       # Seeds streams, subjects, exam types, grading scale
```

### 5. Start development servers

```bash
# From root — starts backend (port 4000) and frontend (port 3000) together
npm run dev
```

Or run them individually:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** in your browser.

### 6. Build for production

```bash
npm run build
```

Starts the compiled backend with:

```bash
cd backend && npm start
```

Starts the compiled frontend with:

```bash
cd frontend && npm start
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Default                 | Description                                                |
| -------------- | ----------------------- | ---------------------------------------------------------- |
| `PORT`         | `4000`                  | API server port                                            |
| `DATABASE_URL` | —                       | PostgreSQL connection string                               |
| `JWT_SECRET`   | —                       | Secret for JWT signing (min 32 chars)                      |
| `CORS_ORIGIN`  | `http://localhost:3000` | Allowed CORS origin                                        |
| `NODE_ENV`     | `development`           | `development` or `production`                              |
| `DATABASE_SSL` | `false`                 | Set to `true` for managed cloud DBs (e.g. Railway, Render) |

**Example:**

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/ikonex_academy
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
DATABASE_SSL=false
```

### Frontend (`frontend/.env.local`)

| Variable              | Default                 | Description          |
| --------------------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API base URL |

---

## Database Schema

The PostgreSQL schema includes 7 core tables:

```sql
class_streams           -- Form 1A through Form 4C
students                -- Student records linked to streams
subjects                -- School subjects (Math, English, etc.)
class_stream_subjects   -- Many-to-many: subjects per stream
exam_types              -- End Term, Mid Term, CAT 1, etc.
scores                  -- Student scores (unique per student+subject+exam)
grading_scales          -- KCSE grading (A=80%+, A-=75%+, ... E=<30%)
```

**Key design decisions:**

- UUID primary keys throughout
- `UNIQUE(student_id, subject_id, exam_type_id)` prevents duplicate scores — re-saving updates in place
- PostgreSQL views (`v_students`, `v_scores`) handle complex joins
- `updated_at` triggers auto-update timestamps
- Seed data pre-loads 12 streams (Form 1A–4C), 12 subjects, 9 exam types, and the full KCSE grading scale

### Kenya KCSE Grading Scale

| Grade | Min % | Points |
| ----- | ----- | ------ |
| A     | 80    | 12     |
| A-    | 75    | 11     |
| B+    | 70    | 10     |
| B     | 65    | 9      |
| B-    | 60    | 8      |
| C+    | 55    | 7      |
| C     | 50    | 6      |
| C-    | 45    | 5      |
| D+    | 40    | 4      |
| D     | 35    | 3      |
| D-    | 30    | 2      |
| E     | 0     | 1      |

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

### Class Streams

| Method | Endpoint                           | Description                |
| ------ | ---------------------------------- | -------------------------- |
| GET    | `/streams`                         | List all streams           |
| POST   | `/streams`                         | Create stream              |
| GET    | `/streams/:id`                     | Get stream details         |
| PUT    | `/streams/:id`                     | Update stream              |
| DELETE | `/streams/:id`                     | Delete stream              |
| GET    | `/streams/:id/students`            | Students in stream         |
| GET    | `/streams/:id/subjects`            | Subjects in stream         |
| POST   | `/streams/:id/subjects`            | Assign subject to stream   |
| DELETE | `/streams/:id/subjects/:subjectId` | Remove subject from stream |

### Students

| Method | Endpoint                                              | Description               |
| ------ | ----------------------------------------------------- | ------------------------- |
| GET    | `/students?page=1&limit=20&search=&streamId=&status=` | List students (paginated) |
| POST   | `/students`                                           | Register student          |
| GET    | `/students/:id`                                       | Get student               |
| PUT    | `/students/:id`                                       | Update student            |
| DELETE | `/students/:id`                                       | Delete student            |
| GET    | `/students/:id/scores`                                | Student scores            |

### Subjects

| Method | Endpoint        | Description    |
| ------ | --------------- | -------------- |
| GET    | `/subjects`     | List subjects  |
| POST   | `/subjects`     | Create subject |
| GET    | `/subjects/:id` | Get subject    |
| PUT    | `/subjects/:id` | Update subject |
| DELETE | `/subjects/:id` | Delete subject |

### Scores & Exam Types

| Method | Endpoint       | Description                 |
| ------ | -------------- | --------------------------- |
| POST   | `/scores`      | Record single score         |
| POST   | `/scores/bulk` | Bulk record scores (upsert) |
| PUT    | `/scores/:id`  | Update score                |
| DELETE | `/scores/:id`  | Delete score                |
| GET    | `/exam-types`  | List exam types             |
| POST   | `/exam-types`  | Create exam type            |

### Results

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| GET    | `/results/student/:id` | Student aggregated results |
| GET    | `/results/class/:id`   | Class ranked results       |

### Reports (PDF)

| Method | Endpoint                           | Description                      |
| ------ | ---------------------------------- | -------------------------------- |
| GET    | `/reports/student/:id/report-card` | Download student PDF report card |
| GET    | `/reports/class/:id`               | Download class performance PDF   |

### Notifications

| Method | Endpoint                        | Description                                                                       |
| ------ | ------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/notifications/missing-scores` | In-progress assessments with missing student scores for the current year (max 20) |

---

## Testing

```bash
cd backend

# Run unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests cover grading utility functions, API response helpers, and score validation logic.

---

## Project Structure

```
ikonex-academy/
├── package.json              # Root workspace scripts (dev, build, install:all)
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts              # Express entry point (port 4000)
│       ├── controllers/
│       │   ├── classStreams.ts
│       │   ├── students.ts
│       │   ├── subjects.ts
│       │   ├── scores.ts
│       │   ├── results.ts        # Aggregation & KCSE grading logic
│       │   └── reports.ts        # PDFKit — student card & class report
│       ├── db/
│       │   ├── schema.sql        # Full schema, views, triggers, seed data
│       │   ├── index.ts          # pg-pool connection (keepAlive, error handler)
│       │   └── migrate.ts        # Runs schema.sql against the database
│       ├── routes/
│       │   └── index.ts
│       ├── types/
│       │   └── index.ts
│       ├── utils/
│       │   ├── grading.ts        # Grade/points calculation
│       │   └── response.ts
│       └── tests/
│           └── grading.test.ts
│
└── frontend/
    ├── package.json
    ├── next.config.js            # standalone output, API rewrites
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── icon.svg              # Favicon (amber-red graduation cap)
        │   ├── page.tsx              # Redirects → /dashboard
        │   ├── dashboard/page.tsx
        │   ├── students/
        │   │   ├── page.tsx          # Student list with search & filter
        │   │   ├── new/page.tsx
        │   │   └── [id]/page.tsx     # Student detail & edit
        │   ├── classes/
        │   │   ├── page.tsx          # Stream grid
        │   │   └── [id]/page.tsx     # Stream detail, subject assignment
        │   ├── subjects/page.tsx
        │   ├── assessments/page.tsx  # Bulk score-entry sheet
        │   ├── results/page.tsx      # Class rankings
        │   └── reports/page.tsx      # PDF generation & preview
        ├── components/
        │   ├── layout/DashboardLayout.tsx
        │   ├── forms/StudentForm.tsx
        │   └── ui/index.tsx
        ├── lib/
        │   ├── api.ts
        │   └── utils.ts
        └── types/index.ts
```

---

## License

MIT © Ikonex Academy

---

_Built with Next.js, Node.js, PostgreSQL, and TypeScript_

# Homesis

A full-stack SaaS home service marketplace connecting customers with verified professionals across Pakistan. Built with React + Vite (frontend) and Node.js + Express + Prisma + SQLite (backend).

## Features

- **AI-powered recommendations** — Describe your problem in plain language; Claude classifies the service type and recommends top-rated providers
- **Role-based access** — Customer, Service Provider, and Admin roles
- **Full booking flow** — pending → accepted/declined → completed → reviewed
- **Reviews & ratings** — Customers rate completed bookings; provider avg recalculates automatically
- **Admin panel** — Provider verification queue and platform stats
- **15 seeded providers** — Pakistani names, PKR pricing, Lahore/Karachi/Islamabad

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@homeassist.pk | admin123 |
| Customer | customer@homeassist.pk | customer123 |
| Provider | ali.khan@example.com | provider123 |

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set JWT_SECRET and optionally ANTHROPIC_API_KEY
npm run db:push
npm run db:seed
npm run dev
```

Backend runs on http://localhost:5000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and proxies `/api` to the backend.

## Environment Variables

### backend/.env

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="sk-ant-..."   # Optional — falls back to keyword matching
PORT=5000
CLIENT_URL=http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, Zod validation |
| Database | Prisma ORM + SQLite |
| Auth | JWT (7-day expiry), bcryptjs |
| AI | Anthropic Claude API (`claude-opus-4-8`) with keyword fallback |

## Project Structure

```
HomeAssist/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── providers.js
│       │   ├── bookings.js
│       │   ├── reviews.js
│       │   ├── categories.js
│       │   ├── ai.js
│       │   └── admin.js
│       └── index.js
└── frontend/
    └── src/
        ├── api/
        ├── components/
        │   ├── layout/
        │   ├── shared/
        │   └── ui/
        ├── contexts/
        └── pages/
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Sign in |
| GET | /api/auth/me | ✓ | Current user |
| GET | /api/categories | — | All categories |
| GET | /api/providers | — | Search providers |
| GET | /api/providers/:id | — | Provider detail |
| POST | /api/bookings | Customer | Create booking |
| GET | /api/bookings/mine | Customer | My bookings |
| GET | /api/bookings/provider | Provider | Incoming bookings |
| PATCH | /api/bookings/:id/status | ✓ | Update status |
| POST | /api/reviews | Customer | Submit review |
| POST | /api/ai/recommend | — | AI recommendations |
| GET | /api/admin/stats | Admin | Platform stats |
| GET | /api/admin/providers/unverified | Admin | Verification queue |
| PATCH | /api/admin/providers/:id/verify | Admin | Verify provider |

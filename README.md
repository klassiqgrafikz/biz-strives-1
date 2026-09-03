# BizStrives — Business Finance Tracker

A full-stack finance tracking application for small businesses built with React (frontend) and Express + Supabase (backend).

## Features

- **Dashboard**: Monthly income, expenses, savings, net cash flow
- **Customers**: CRUD with birthdays
- **Payments**: Track incoming payments per customer
- **Expenses**: Personal spending with categories
- **Savings**: Pot with deposits/withdrawals, running balance
- **Reports**: Monthly view with PDF download
- **Messages**: Editable templates (monthly + birthday), manual run buttons, send log
- **Settings**: Business info, Gmail SMTP, timezone, automation schedule
- **Automation**: Daily birthday emails (8am), month-end statements + bulk messages (last day 9pm Lagos time)

## Tech Stack

- **Frontend**: React 18 + Vite + React Router + Tailwind CSS
- **Backend**: Express + Node.js + PostgreSQL (Supabase)
- **Auth**: JWT tokens
- **Email**: Nodemailer + Gmail SMTP
- **PDF**: pdfkit
- **Scheduling**: node-cron with catch-up logic

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free tier)

### 1. Supabase Setup

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `server/db/schema.sql`
3. Get your connection string: Settings → Database → Connection string → URI
4. Copy the connection string (use the "Session Pooler" or "Direct" one)

### 2. Environment Variables

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
# Edit with your values
```

Required:
- `DATABASE_URL` - Supabase connection string
- `JWT_SECRET` - Random string (e.g., `openssl rand -base64 32`)
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - [App Password](https://myaccount.google.com/apppasswords) (not your regular password)

**Client** (`client/.env`):
```bash
echo "VITE_API_URL=http://localhost:3001" > client/.env
```

### 3. Install & Run Locally

```bash
# Install all dependencies (client + server)
npm run install:all

# Initialize database (run once)
npm run init-db

# Start both client and server
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 4. First Run

1. Open http://localhost:5173
2. Register your admin account (first user only)
3. Go to Settings → Enter Gmail credentials, statement email, timezone
4. Add customers, record payments/expenses, set up templates
5. Test: Messages → "Run Month-End Now" to generate PDF + send emails

## Deployment

### Frontend (Netlify / Vercel / Appwrite Sites / GitHub Pages)

**Netlify / Vercel / GitHub Pages:**
1. Connect your GitHub repo
2. Root directory: `client/`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment variable: `VITE_API_URL=https://your-api-domain.com`

**Appwrite Sites** (working directory is already `client/`):
1. Connect your GitHub repo, branch `master`
2. Framework: **Other** (manual static config)
3. Install command: `npm install`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variable: `VITE_API_URL=https://your-api-domain.com`

### Backend (Render / Railway / Fly.io / VPS)

1. Connect your GitHub repo
2. Root directory: `server/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variables:
   - `DATABASE_URL` - Supabase connection string
   - `JWT_SECRET` - Same as local
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD`
   - `CLIENT_URL` - Your frontend URL (e.g., `https://your-app.netlify.app`)
   - `PORT` - Will be set by host (Render/Railway set automatically)
   - `TZ=Africa/Lagos` (or your timezone)

### Supabase Notes

- Free tier pauses database after **7 days of inactivity**
- The server includes a **keep-alive ping every 6 hours** to prevent this
- If paused, first request will wake it (adds ~10s latency)

## Project Structure

```
biz-strives-1/
├── client/                      # React SPA
│   ├── src/
│   │   ├── components/          # Layout, Modal, StatCard
│   │   ├── hooks/useAuth.jsx    # JWT auth context
│   │   ├── lib/api.js           # Fetch wrapper with JWT
│   │   └── pages/               # All page components
│   └── package.json
├── server/                      # Express API
│   ├── routes/                  # API routes (auth, customers, payments, etc.)
│   ├── jobs/cron.js             # Cron jobs (birthday, monthly, catch-up)
│   ├── db/                      # pg pool + schema.sql
│   └── server.js
├── package.json                 # Root scripts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | First-time admin registration |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Verify token, get user |
| GET | /api/dashboard | Dashboard stats + recent activity |
| GET/POST/PUT/DELETE | /api/customers | Customer CRUD |
| GET/POST/PUT/DELETE | /api/payments | Payment CRUD |
| GET/POST/PUT/DELETE | /api/expenses | Expense CRUD |
| GET/POST/DELETE | /api/savings | Savings (deposit/withdraw) |
| GET | /api/reports?month=YYYY-MM | Monthly report data |
| GET | /api/reports/pdf?month=... | Download PDF statement |
| GET/POST/PUT/DELETE | /api/templates | Message templates |
| GET/PUT | /api/settings | Business + Gmail config |
| GET | /api/messages/log | Send log |
| POST | /api/admin/run-birthday | Manual birthday run |
| POST | /api/admin/run-monthly | Manual month-end run |

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Birthday | Daily 08:00 (Lagos) | Sends birthday emails to customers with today's birthday |
| Monthly | Daily 21:00 | Runs only on last day of month (checks if tomorrow is 1st) |
| Catch-up | On startup | Runs any missed birthday/monthly jobs |

**Catch-up logic**: Uses `job_runs` table to track executed jobs — prevents duplicate emails on restart.

## License

MIT
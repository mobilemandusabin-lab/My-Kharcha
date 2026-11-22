# MyKharcha

Personal & Family Expense Tracker (NPR, Bikram Sambat + Nepal time) built as a mobile-first PWA.

## Stack
- **Frontend:** React + Vite + Tailwind CSS, React Router, Lucide, Recharts, PWA (vite-plugin-pwa)
- **Backend:** Node.js + Express + Mongoose
- **Database:** MongoDB (falls back to in-memory MongoDB for local dev if `MONGODB_URI` is not set)
- **Offline:** IndexedDB queue with idempotent sync (`clientTransactionId`)
- **Tests:** Vitest/Supertest (backend), Playwright (E2E)

## Features (implemented)
- Email/password multi-user auth (persistent session; `/quick-add` prompts login first if unauthenticated)
- Personal & family scopes (multiple families, roles, invitations, member contributions) with strict isolation
- Expenses, income, bookmarks, edit/delete, history filters/sort
- Credit/Udharo: unpaid status on transactions, settle later (no duplicate transaction)
- BS-month based dashboard, budgets, reports, and month-end income-vs-expense matching (month starts BS day 1)
- Weekly reports Sun–Sat (Asia/Kathmandu) with Saturday marked holiday
- Nepali (BS) primary dates + AD secondary, UTC storage with Nepal-time conversion
- Quick Add route `/quick-add` for Apple Shortcut / iPhone Back Tap workflow
- PWA manifest/service worker basics, offline create queue + sync on reconnect/focus
- Seed script with sample personal (20 rows) and family (Awal Family) data

## Project structure
See `plan.md` and repository folders: `frontend/`, `backend/`, `docs/`.

## Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB (optional locally; in-memory fallback used when `MONGODB_URI` is empty)

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment
Copy `.env.example` to `.env` (root or backend as needed) and adjust:
```bash
cp .env.example .env
```
Key vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `PORT`.

### 3. Run backend
```bash
cd backend
npm run dev   # or: npm start
```
API: `http://localhost:5000`

### 4. Run frontend
```bash
cd frontend
npm run dev
```
App: `http://localhost:5173` (proxies `/api` to backend)

## Seed / test data (development only)
```bash
cd backend
npm run seed        # load/reset seeded sample data
npm run seed -- --reset  # clear seeded records only
```
When backend is running (dev), you can also seed the active DB instance via:
- `POST /api/dev/seed`
- `POST /api/dev/seed/reset`

Seeded accounts include:
- `sabin.seed@mykharcha.local` / `password123` (Awal Family admin, sample personal/family data)
- `shivani.seed@mykharcha.local` / `password123`
- `member3.seed@mykharcha.local` / `password123`
- `user@gmail.com` / `123456` (user)
- `user2@gmail.com` / `123456` (user, seed)
- `superadmin@gmail.com` / `123456` (**superadmin**: can view all users and families in Settings/Admin)

Seeded records are marked and reset/clear operations target seeded records only (never delete real user/family data). A **TEST DATA** context should be shown when sample data is active.

## Testing

### Backend
```bash
cd backend
npm test
```

### Playwright (E2E)
From project root (after installing Playwright):
```bash
npx playwright test
```
> Ensure backend and frontend are running (or configured via Playwright webServer) and browsers are installed (`npx playwright install`).

## iPhone Back Tap / Quick Add
See `docs/IOS_BACK_TAP_SETUP.md`. Quick Add URL: `/quick-add`. Physical Back Tap must be tested on a real iPhone.

## Test results
See `docs/TEST_RESULTS.md` for actual execution records (no fabricated results).

## Security notes
- Do not commit `.env` or expose MongoDB credentials.
- Use HTTPS in production; set strong `JWT_SECRET`.
- Backend enforces auth/authorization and family data isolation.

## Deployment (Vercel)

### Option A: Single Vercel project (frontend + API serverless)
1. Push repo to GitHub and import in Vercel.
2. Set **Root Directory** to repo root.
3. Vercel will use `vercel.json`:
   - installs root/backend/frontend deps
   - builds frontend (`frontend/dist`)
   - routes `/api/*` to `api/index.js`
4. Add Environment Variables in Vercel:
   - `MONGODB_URI` = your MongoDB Atlas URI (required)
   - `JWT_SECRET` = long random secret
   - `CLIENT_URL` = `https://your-app.vercel.app`
   - `NODE_ENV` = `production`
   - `JWT_EXPIRES_IN` = `30d`
   - `COOKIE_NAME` = `mykharcha_token`
5. Deploy. Quick Add URL: `https://your-app.vercel.app/quick-add`

> Note: Express on Vercel serverless has cold starts and execution limits. For heavier production use, use Option B.

### Option B: Frontend on Vercel, Backend on Render/Railway (recommended for Express)
1. **Backend** (Render/Railway):
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (Vercel frontend URL), `NODE_ENV=production`, `PORT`
2. **Frontend** (Vercel):
   - Root: `frontend`
   - Build: `npm run build`
   - Output: `dist`
   - Env var: `VITE_API_URL=https://your-backend.onrender.com` (if different domain)
3. Ensure backend CORS allows the frontend domain (`CLIENT_URL`).

## Mobile input overflow fix
- Global form controls set to `min-w-0`, `max-width: 100%`, `font-size: 16px` to prevent iOS zoom and horizontal overflow.
- Date/time grids stack on small screens.

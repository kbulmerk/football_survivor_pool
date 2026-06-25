# Football Survivor Pool

React web app for a family NFL survivor pool, hosted on Railway.

## How it works

Each week, players pick **one NFL team to lose**. If your team wins or ties, you're eliminated. Last one standing wins. You can never reuse a team you've already picked.

## Stack

- **Next.js** (App Router, TypeScript) — framework
- **Railway** — hosting + PostgreSQL
- **Clerk** — phone number authentication
- **Drizzle ORM** — type-safe database queries
- **Twilio** — SMS reminders
- **Tailwind CSS** — styling

## Local setup

### Prerequisites

- Node.js 20.9+
- A PostgreSQL database (local via `brew install postgresql` or a free Railway/Neon instance)
- A [Clerk](https://dashboard.clerk.com) account with **phone number** auth enabled

### Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
   | `DATABASE_URL` | Your Postgres connection string |
   | `TWILIO_*` | Twilio console — **optional for local dev**, SMS just won't send |
   | `CRON_SECRET` | Any random string (e.g. `openssl rand -hex 32`) |
   | `ADMIN_USER_ID` | Your Clerk user ID (found in Clerk dashboard → Users) |
   | `VENMO_HANDLE` | Your Venmo username (shown on payment page) |

3. Run database migrations:
   ```bash
   npm run db:generate   # generate migration files from schema
   npm run db:migrate    # apply to your database
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

   App runs at [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` until you sign in with a phone number via Clerk.

### Clerk setup note

In your Clerk dashboard, go to **User & Authentication → Email, Phone, Username** and enable **Phone number** as the only sign-in identifier. The app expects phone-number-based auth.

## Database

Schema lives in `lib/schema.ts`. After changing it:

```bash
npm run db:generate   # generate new migration file
npm run db:migrate    # apply to database
```

## Cron jobs

Configured as Railway Cron services that hit protected API routes:

| Schedule | Route | Action |
|---|---|---|
| Tue 9am | `/api/cron/tuesday-open` | Open picks, SMS all alive members |
| Sat 9am | `/api/cron/saturday-remind` | Remind unpicked members |
| Sun 12am | `/api/cron/saturday-lock` | Lock all picks |
| Mon 1am | `/api/cron/monday-results` | Evaluate results, update standings |

Each route requires `Authorization: Bearer $CRON_SECRET` header.

### Testing cron jobs locally

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Run a script with your env vars inline:
   ```bash
   APP_URL=http://localhost:3000 CRON_SECRET=<your-cron-secret> sh scripts/cron/saturday-lock.sh
   ```

   Replace `saturday-lock.sh` with whichever script you want to test.

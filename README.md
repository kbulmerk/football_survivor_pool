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

1. Copy `.env.example` to `.env.local` and fill in your keys
2. `npm install`
3. `npm run db:generate` — generate migrations from schema
4. `npm run db:migrate` — apply migrations to your database
5. `npm run dev`

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

# JobPilot — AI job search agent

Live: https://jobpilot-app.vercel.app

Upload your CV once. JobPilot builds your profile, searches job boards, scores every role against you, drafts cover letters and tracks your applications.

## Features
- **Accounts** — email + password sign-up, database-backed sessions, every record scoped to its owner.
- **CV → profile** — PDF/DOCX/TXT parsing: name, contact, titles, ~150-skill dictionary, years of experience, languages, summary. Fully editable.
- **Preferences** — target titles, locations, remote/hybrid/on-site, exclusions (keywords & companies), job age limit, sources, daily auto-search.
- **Job search (searched automatically, all selectable)** — LinkedIn (public listings + full descriptions for top matches), Bayt, GulfTalent, Wuzzuf, Remotive, Arbeitnow, Himalayas, Jobicy, Remote OK. Country-aware (Egypt, Saudi Arabia, UAE, Qatar, Kuwait, Oman, Bahrain, Jordan), de-duplicated, freshness-filtered, with per-site status. Pick sites per search or set defaults.
- **Quick-search links (selectable)** — LinkedIn, Bayt, Wuzzuf, Glassdoor, GulfTalent, Naukrigulf, foundit Gulf, Indeed (country sites), Google Jobs — for sites that block automated search.
- **Site status** — `/api/status` checks every automatic source (cached 6 h).
- **Matching** — 0–100 score from skills (45%), title (30%), location & mode (15%), seniority (10%), with matched skills, gaps and an explanation. With `ANTHROPIC_API_KEY`, Claude re-scores the top 10 of each search.
- **Jobs board** — tabs (open / saved / applied / hidden), search, score/mode/source filters, sort, pagination.
- **Apply assistant** — cover letter (Claude or template), saved-answer library, “I've applied” tracking.
- **Application tracker** — statuses, follow-up reminders, notes, contacts, manual entries.
- **Excel export** — Summary, Jobs, Applications, Searches and Answers sheets.

## Stack
Next.js 16 (App Router, server actions) · React 19 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Neon) · ExcelJS · pdf-parse · mammoth.

## Environment variables
| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection (pooled is fine) |
| `DATABASE_URL_UNPOOLED` | no | Direct connection used for migrations |
| `ANTHROPIC_API_KEY` | no | Claude scoring + cover letters |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-haiku-5-5` |
| `CRON_SECRET` | no | Enables the daily search (`vercel.json` cron → `/api/cron`) |

## Development
```bash
npm install
export DATABASE_URL=postgres://user:pass@localhost:5432/autopilot
npm run db:migrate   # apply migrations in ./drizzle
npm run dev
```
Change the schema in `src/db/schema.ts`, then `npm run db:generate` to create a migration. Builds run migrations automatically (`npm run build`).

## Project layout
```
src/app/(auth)        sign in / sign up
src/app/(app)         dashboard, jobs, job detail, applications, profile, preferences, answers, account
src/app/actions       server actions (auth, settings, jobs, tracker)
src/app/api           cv upload, search, excel export, cron
src/lib               cv-parser, skills, sources, matcher, search, cover-letter, excel-export, auth, ai
src/db                Drizzle schema + client
drizzle/              SQL migrations
worker/               optional local Playwright form-filler (not deployed)
```

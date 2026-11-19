# AUTOPILOT ? AI Job Search & Automated Application Agent

A full-stack web application that acts as a personal AI job-search and job-application agent.
Upload your CV once, configure target countries/cities/titles, and let the agent discover, score,
and (where permitted) submit applications ? producing a detailed 8-worksheet Excel workbook after every run.

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes (Node.js/TypeScript)
- **Database**: Prisma ORM + SQLite (dev). Swap to PostgreSQL for production (see below).
- **AI**: Provider-independent (Claude or OpenAI) via env vars; falls back to a heuristic scorer if no key.
- **Browser automation**: Playwright (Chromium) ? local Windows worker with persistent sessions.
- **Excel**: ExcelJS ? real `.xlsx` with 8 worksheets, formulas, dropdowns, conditional formatting, hyperlinks.
- **CV parsing**: pdf-parse + mammoth (PDF/DOCX).

## Quick start
```bash
npm install
npx playwright install chromium   # one-time
npx prisma migrate dev --name init
npm run dev
```
Open http://localhost:3000.

## Environment variables (.env)
```
DATABASE_URL="file:./dev.db"
# Optional AI keys (heuristic scorer used if absent):
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
# or
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Features implemented
- CV upload (PDF/DOCX) + parsing ? structured professional profile (skills, titles, contact)
- Job discovery from real public APIs: Remotive, Arbeitnow, Himalayas (336 jobs in test run)
- AI job matching (0-100 score, classification, strong skills, missing reqs, eligibility)
- Deduplication by source URL
- Application tracking (status, attempts, answers)
- Answer library (verified Q&A)
- Employer database
- Agent run tracking with logs
- **Excel export with 8 worksheets**: Open Jobs, Other Skill Matches, Applications Submitted,
  Application Attempts, Other Skill & Career Opportunities, Summary (with charts-ready breakdowns),
  Sources Checked, Follow-Ups ? with formulas, dropdowns, conditional formatting, hyperlinks
- Browser worker (Playwright) with generic form-filling, file upload, screenshots, apply-click
- Dashboard: overview stats, CV upload, run trigger, job table, Excel download

## Switching to PostgreSQL (production)
1. Install PostgreSQL (e.g. via the EnterpriseDB installer or a managed service like Neon/Supabase).
2. Change `prisma/schema.prisma`: `provider = "postgresql"`.
3. Update `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/autopilot"`.
4. Run `npx prisma migrate deploy`.

## Architecture
```
Web Dashboard  ->  Next.js API routes  ->  Prisma (SQLite/Postgres)
                      |
                      +-> AI Matcher (Claude/OpenAI)
                      +-> Job Discovery (public APIs)
                      +-> Excel Export (ExcelJS)
                      +-> Browser Worker (Playwright)
```

## Notes on automation ethics
The browser worker uses real Playwright against real sites. It never bypasses CAPTCHAs or bot protection,
never creates accounts without permission, and never claims submission without website confirmation.
Sites that prohibit automation fall back to assisted mode.

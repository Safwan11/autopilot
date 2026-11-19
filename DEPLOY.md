# Deploy AUTOPILOT (Vercel + Neon Postgres)

Production runs on **Vercel** with a **Neon Postgres** database added from Vercel's Storage tab.

1. Vercel -> Add New -> Project -> import `Safwan11/autopilot` (framework: Next.js, defaults).
2. Project -> Storage -> Create Database -> Neon (free) -> connect to the project.
   This injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct), which `prisma/schema.prisma` uses.
3. Redeploy. The build runs `prisma generate && prisma db push && next build`, so tables are created automatically.
4. Optional: add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) for AI matching; without it a heuristic scorer is used.

## Notes
- CVs are parsed in memory; only the extracted text is stored. Excel reports are generated on demand at `/api/excel?runId=...`.
- The Playwright browser worker (auto-apply) cannot run on Vercel; run it locally against the deployed database.
- Local dev: run a Postgres (or use the Neon dev branch) and set both env vars in `.env`.

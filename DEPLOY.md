# Deploying JobPilot

Production runs on **Vercel** (team "Muslim Tech", project `jobpilot` (domain jobpilot-app.vercel.app)) with a **Neon Postgres** database (`autopilot-db`) connected from Vercel's Storage tab. Every push to `main` deploys automatically.

- Neon injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- `npm run build` runs `scripts/migrate.mjs` first, so new tables/columns are applied on deploy.

## Optional extras (Vercel → Project → Settings → Environment Variables, then redeploy)
- `ANTHROPIC_API_KEY` — Claude-powered match scoring and cover letters.
- `CRON_SECRET` — any long random string. Turns on the daily 05:00 UTC search for users who enable it in Preferences.

## Notes
- Old Prisma tables from v1 (`"User"`, `"Job"`, …) are left untouched in the database; v2 uses new lowercase tables.
- The Playwright worker in `worker/` can't run on Vercel; it's kept for local experiments only.

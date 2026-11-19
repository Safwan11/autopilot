# Deploy AUTOPILOT to GitHub + Cloudflare Pages (workers.dev) + Supabase

## Step 1 ? Push to GitHub (one-time, on your machine)

```bash
# 1. Create an empty repo on github.com (no README, no .gitignore)
# 2. Then:
cd C:\Users\USE\Documents\autopilot
git remote add origin https://github.com/YOUR_USERNAME/autopilot.git
git branch -M main
git push -u origin main
```

## Step 2 ? Create a free Supabase project (database)

1. Go to https://supabase.com ? "Start your project" ? sign in with GitHub
2. Create a new project (free tier): name `autopilot`, pick a region close to you, set a DB password
3. Wait ~2 min for provisioning
4. Go to **Settings ? Database ? Connection string ? URI** and copy it (replace `[YOUR-PASSWORD]`)
5. Run the migration: paste the SQL from `supabase/migrations/0001_init.sql` into Supabase **SQL Editor** ? Run
6. (Optional) Also set up Storage bucket `cvs` for CV uploads

## Step 3 ? Deploy to Cloudflare Pages (free workers.dev domain)

1. Go to https://dash.cloudflare.com ? **Workers & Pages ? Create application ? Pages ? Connect to Git**
2. Select your GitHub repo `autopilot`
3. Build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Node version**: 20 (set in env vars as `NODE_VERSION=20`)
4. Environment variables (add in Cloudflare dashboard):
   - `DATABASE_URL` = your Supabase connection string
   - `NEXT_PUBLIC_SUPABASE_URL` = https://your-project.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key (from Supabase ? Settings ? API)
   - `ANTHROPIC_API_KEY` = (optional, for AI matching)
5. Click **Save and Deploy**

You'll get a free URL like `https://autopilot.pages.dev` (or `autopilot-xxx.pages.dev`).

## Step 4 ? (Optional) Custom domain
Cloudflare Pages ? your project ? Custom domains ? add your domain (free if you use Cloudflare DNS).

## Notes
- **Browser worker (Playwright)** cannot run on Cloudflare's edge. For auto-applying, run `npx playwright` locally pointed at your deployed API, or deploy the worker to a VPS.
- **CV uploads** use the local filesystem in dev. For production, swap to Supabase Storage or Cloudflare R2 (the upload route is in `src/app/api/cv/route.ts`).
- **AI matching** works without API keys (heuristic scorer fallback), but adding an Anthropic/OpenAI key gives much better results.
- **Database**: local dev uses SQLite; production uses Supabase Postgres. The Prisma schema is identical ? just change `provider = "postgresql"` and the `DATABASE_URL`.

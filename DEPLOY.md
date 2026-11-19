# Deploy AUTOPILOT to Cloudflare Pages + D1

## 1. Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/autopilot.git
git branch -M main
git push -u origin main
```

## 2. Create a Cloudflare D1 database
```bash
npx wrangler login
npx wrangler d1 create autopilot-db
```
Copy the `database_id` from the output and paste it into `wrangler.toml` (replace `YOUR_D1_DATABASE_ID`).

## 3. Run the D1 migration
```bash
npx wrangler d1 execute autopilot-db --file=./migrations/0001_init.sql
```

## 4. Configure environment variables in Cloudflare Pages dashboard
- `DATABASE_URL` is not needed for D1 (binding is via wrangler.toml)
- `ANTHROPIC_API_KEY` (optional, for AI matching)
- `OPENAI_API_KEY` (optional alternative)

## 5. Deploy
Option A ? via Cloudflare dashboard:
1. Go to Cloudflare Pages ? Create a project ? Connect to Git
2. Select your GitHub repo
3. Build command: `npm run build`
4. Build output directory: `.next`
5. Deploy

Option B ? via CLI:
```bash
npm run cf:build
npx wrangler pages deploy
```

## 6. Notes
- The Playwright browser worker cannot run on Cloudflare's edge runtime. For automated applications, run the worker locally (or on a VPS) and point it at the deployed API.
- File uploads (CVs) need Cloudflare R2 or an external storage service in production. The local dev uses the filesystem.
- For a simpler deployment, consider Vercel + Neon (free tiers) which support Next.js + Node.js runtime + Postgres natively.

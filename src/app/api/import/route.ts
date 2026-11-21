import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, preferences, profiles, runs } from "@/db/schema";
import { userFromImportToken } from "@/lib/importer";
import { scoreJob } from "@/lib/matcher";
import { htmlToText } from "@/lib/text";
import type { RawJob } from "@/lib/sources";

export const maxDuration = 60;

// Called by the JobPilot browser extension (token auth, no cookies), so CORS is open.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Connection test for the extension's settings screen. */
export async function GET(req: Request) {
  const user = await userFromImportToken(req.headers.get("authorization"));
  if (!user) return json({ error: "Invalid or expired token. Create a new one in JobPilot → Browser importer." }, 401);
  return json({ ok: true, name: user.name, email: user.email });
}

const Job = z.object({
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().max(200).optional().default(""),
  url: z.string().url().max(2000),
  location: z.string().trim().max(300).optional().nullable(),
  description: z.string().max(60_000).optional().nullable(),
  postedAt: z.string().max(60).optional().nullable(),
  externalId: z.string().max(200).optional().nullable(),
  employmentType: z.string().max(100).optional().nullable(),
  salary: z.string().max(200).optional().nullable(),
  remoteType: z.enum(["Remote", "Hybrid", "Onsite"]).optional().nullable(),
  tags: z.array(z.string().max(80)).max(20).optional().default([]),
});
const Body = z.object({
  source: z.string().trim().min(1).max(40),
  pageUrl: z.string().max(2000).optional(),
  jobs: z.array(Job).min(1).max(100),
});

const KNOWN: Record<string, string> = {
  "bayt.com": "Bayt", "gulftalent.com": "GulfTalent", "wuzzuf.net": "Wuzzuf", "linkedin.com": "LinkedIn",
  "naukrigulf.com": "Naukrigulf", "glassdoor.com": "Glassdoor", "indeed.com": "Indeed", "founditgulf.com": "foundit Gulf",
};
function sourceName(raw: string, url: string) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const hit = Object.entries(KNOWN).find(([d]) => host === d || host.endsWith("." + d));
  return hit ? hit[1] : raw.slice(0, 40);
}

export async function POST(req: Request) {
  const user = await userFromImportToken(req.headers.get("authorization"));
  if (!user) return json({ error: "Invalid or expired token. Create a new one in JobPilot → Browser importer." }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Nothing to import: " + parsed.error.issues[0].message }, 400);
  const { jobs: incoming, pageUrl } = parsed.data;

  const [[profile], [prefs]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
    db.select().from(preferences).where(eq(preferences.userId, user.id)),
  ]);

  const seen = new Set<string>();
  const raws: RawJob[] = [];
  for (const j of incoming) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    const desc = j.description ? (/<[a-z][\s\S]*>/i.test(j.description) ? htmlToText(j.description) : j.description.trim()) : "";
    const posted = j.postedAt ? new Date(j.postedAt) : null;
    raws.push({
      source: sourceName(parsed.data.source, j.url),
      externalId: j.externalId ?? null,
      url: j.url,
      applyUrl: j.url,
      title: j.title,
      company: j.company || "Confidential",
      companyLogo: null,
      location: j.location ?? null,
      remoteType: j.remoteType ?? (/remote/i.test(`${j.title} ${j.location ?? ""}`) ? "Remote" : /hybrid/i.test(`${j.title} ${j.location ?? ""}`) ? "Hybrid" : null),
      employmentType: j.employmentType ?? null,
      salary: j.salary ?? null,
      tags: j.tags ?? [],
      description: desc.slice(0, 20_000),
      postedAt: posted && !isNaN(posted.getTime()) ? posted : null,
    });
  }

  const source = raws[0]?.source ?? parsed.data.source;
  const [run] = await db
    .insert(runs)
    .values({ userId: user.id, trigger: "import", queries: [pageUrl ? pageUrl.slice(0, 200) : source], status: "running" })
    .returning();

  // Existing jobs: fill in a description we didn't have before, and re-score.
  const existing = await db
    .select({ id: jobs.id, url: jobs.url, description: jobs.description, status: jobs.status })
    .from(jobs)
    .where(and(eq(jobs.userId, user.id), inArray(jobs.url, raws.map((r) => r.url))));
  const byUrl = new Map(existing.map((e) => [e.url, e]));

  let added = 0;
  let updated = 0;
  const minScore = prefs?.minScore ?? 55;
  let matched = 0;
  for (const raw of raws) {
    const m = scoreJob(raw, profile ?? {}, prefs ?? {});
    if (!m.excluded && m.score >= minScore) matched += 1;
    const ex = byUrl.get(raw.url);
    if (ex) {
      if (!ex.description && raw.description) {
        await db.update(jobs).set({
          description: raw.description, score: m.score, breakdown: m.breakdown, matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills, reasoning: m.reasoning,
        }).where(eq(jobs.id, ex.id));
        updated += 1;
      }
      continue;
    }
    const res = await db.insert(jobs).values({
      userId: user.id, runId: run.id, source: raw.source, externalId: raw.externalId, url: raw.url, applyUrl: raw.applyUrl,
      title: raw.title, company: raw.company, location: raw.location, remoteType: raw.remoteType, employmentType: raw.employmentType,
      salary: raw.salary, tags: raw.tags, description: raw.description, postedAt: raw.postedAt, score: m.score, breakdown: m.breakdown,
      matchedSkills: m.matchedSkills, missingSkills: m.missingSkills, reasoning: m.reasoning, status: m.excluded ? "hidden" : "new",
    }).onConflictDoNothing().returning({ id: jobs.id });
    added += res.length;
  }

  await db.update(runs).set({
    status: "completed", jobsFound: raws.length, jobsNew: added, jobsMatched: matched,
    sourceStats: { [source]: { found: raws.length, kept: added } }, finishedAt: new Date(),
  }).where(eq(runs.id, run.id));

  return json({ ok: true, received: raws.length, added, updated, goodMatches: matched });
}

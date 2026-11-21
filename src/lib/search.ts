import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs, preferences, profiles, runs, type Profile, type Preferences, type SourceStat } from "@/db/schema";
import { SOURCES, matchesQuery, type RawJob } from "./sources";
import { scoreJob, type MatchResult } from "./matcher";
import { aiEnabled, askClaude, parseJsonLoose } from "./ai";

const MAX_QUERIES = 5;
const AI_RESCORE_TOP = 10;

export function searchQueries(profile: Partial<Profile> | undefined, prefs: Partial<Preferences> | undefined): string[] {
  const list = (prefs?.keywords?.length ? prefs.keywords : profile?.titles?.length ? profile.titles : profile?.headline ? [profile.headline] : []) ?? [];
  const cleaned = list.map((q) => q.trim()).filter(Boolean);
  return [...new Set(cleaned.map((q) => q.toLowerCase()))].slice(0, MAX_QUERIES);
}

async function aiRescore(job: RawJob, base: MatchResult, profile: Partial<Profile>) {
  const text = await askClaude(
    `You are a strict recruiter. Score from 0-100 how well this candidate fits this job. Consider skills, title, seniority and location/visa restrictions.

CANDIDATE
Headline: ${profile.headline ?? "-"}
Titles: ${(profile.titles ?? []).join(", ")}
Years of experience: ${profile.yearsExperience ?? "unknown"}
Location: ${profile.location ?? "-"}
Skills: ${(profile.skills ?? []).join(", ")}
Summary: ${(profile.summary ?? "").slice(0, 800)}

JOB
${job.title} at ${job.company} (${job.location ?? "-"}, ${job.remoteType ?? "-"})
${job.description.slice(0, 3500)}

Reply with JSON only: {"score": number, "reasoning": "2 short sentences, second person", "matchedSkills": string[], "missingSkills": string[]}`,
    500,
  );
  const json = parseJsonLoose<{ score: number; reasoning: string; matchedSkills?: string[]; missingSkills?: string[] }>(text);
  if (!json || typeof json.score !== "number") return null;
  return {
    ...base,
    score: Math.max(0, Math.min(100, Math.round(json.score))),
    reasoning: json.reasoning || base.reasoning,
    matchedSkills: json.matchedSkills?.length ? json.matchedSkills.slice(0, 12) : base.matchedSkills,
    missingSkills: json.missingSkills?.length ? json.missingSkills.slice(0, 8) : base.missingSkills,
  };
}

export async function runSearch(userId: string, trigger: "manual" | "scheduled" = "manual") {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  const queries = searchQueries(profile, prefs);
  if (!queries.length) throw new Error("Add target job titles in Preferences (or upload your CV) before searching.");

  const [run] = await db.insert(runs).values({ userId, trigger, queries }).returning();
  try {
    const enabled = SOURCES.filter((s) => !prefs?.sources?.length || prefs.sources.includes(s.id));
    const stats: Record<string, SourceStat> = {};
    const collected: RawJob[] = [];

    await Promise.all(
      enabled.flatMap((src) =>
        queries.map(async (q) => {
          stats[src.name] ??= { found: 0, kept: 0 };
          try {
            const found = await src.search(q);
            const relevant = found.filter((j) => j.url && j.title && j.company && matchesQuery(j, q));
            stats[src.name].found += relevant.length;
            collected.push(...relevant);
          } catch (e) {
            stats[src.name].error = e instanceof Error ? e.message : String(e);
          }
        }),
      ),
    );

    // Freshness + de-duplication (same URL, or same title at the same company).
    const maxAge = (prefs?.maxAgeDays ?? 30) * 86_400_000;
    const seen = new Set<string>();
    const unique = collected.filter((j) => {
      if (j.postedAt && Date.now() - j.postedAt.getTime() > maxAge) return false;
      const k1 = j.url;
      const k2 = `${j.title}|${j.company}`.toLowerCase();
      if (seen.has(k1) || seen.has(k2)) return false;
      seen.add(k1);
      seen.add(k2);
      return true;
    });

    let scored = unique.map((job) => ({ job, match: scoreJob(job, profile ?? {}, prefs ?? {}) }));
    scored.sort((a, b) => b.match.score - a.match.score);

    // Optional: let Claude re-score the best candidates.
    const aiIds = new Set<number>();
    if (aiEnabled() && profile) {
      const top = scored.slice(0, AI_RESCORE_TOP);
      const rescored = await Promise.all(top.map((s) => (s.match.excluded ? null : aiRescore(s.job, s.match, profile))));
      rescored.forEach((r, i) => {
        if (r) {
          top[i].match = r;
          aiIds.add(i);
        }
      });
      scored = [...top, ...scored.slice(AI_RESCORE_TOP)];
    }

    const minScore = prefs?.minScore ?? 55;
    let inserted = 0;
    const rows = scored.map(({ job, match }, i) => ({
      userId,
      runId: run.id,
      source: job.source,
      externalId: job.externalId,
      url: job.url,
      applyUrl: job.applyUrl,
      title: job.title.slice(0, 300),
      company: job.company.slice(0, 200),
      companyLogo: job.companyLogo,
      location: job.location,
      remoteType: job.remoteType,
      employmentType: job.employmentType,
      salary: job.salary,
      tags: job.tags.slice(0, 20),
      description: job.description.slice(0, 20_000),
      postedAt: job.postedAt,
      score: match.score,
      breakdown: match.breakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      reasoning: match.reasoning,
      aiScored: aiIds.has(i),
      status: match.excluded ? "hidden" : "new",
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const res = await db.insert(jobs).values(rows.slice(i, i + 100)).onConflictDoNothing().returning({ id: jobs.id, source: jobs.source });
      inserted += res.length;
      for (const r of res) {
        const name = SOURCES.find((s) => s.name === r.source)?.name ?? r.source;
        if (stats[name]) stats[name].kept += 1;
      }
    }

    const matchedCount = scored.filter((s) => !s.match.excluded && s.match.score >= minScore).length;
    const [done] = await db
      .update(runs)
      .set({ status: "completed", jobsFound: unique.length, jobsNew: inserted, jobsMatched: matchedCount, sourceStats: stats, finishedAt: new Date() })
      .where(eq(runs.id, run.id))
      .returning();
    return done;
  } catch (e) {
    await db
      .update(runs)
      .set({ status: "failed", error: e instanceof Error ? e.message : String(e), finishedAt: new Date() })
      .where(and(eq(runs.id, run.id), eq(runs.userId, userId)));
    throw e;
  }
}

/** Re-score all of a user's stored jobs after their profile or preferences change. */
export async function rescoreAll(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  const all = await db.select().from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.aiScored, false)));
  for (const j of all) {
    const m = scoreJob(
      { ...j, remoteType: j.remoteType as RawJob["remoteType"], tags: j.tags ?? [] },
      profile ?? {},
      prefs ?? {},
    );
    await db
      .update(jobs)
      .set({
        score: m.score,
        breakdown: m.breakdown,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
        reasoning: m.reasoning,
        status: m.excluded && j.status === "new" ? "hidden" : j.status,
      })
      .where(eq(jobs.id, j.id));
  }
  return all.length;
}

export const countJobs = (userId: string) =>
  db.select({ n: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.userId, userId)).then((r) => r[0]?.n ?? 0);

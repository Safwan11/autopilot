import Link from "next/link";
import { and, desc, eq, sql, lte, inArray } from "drizzle-orm";
import { Check, Circle, ArrowRight, BellRing, Radar } from "lucide-react";
import { db } from "@/db";
import { applications, jobs, preferences, profiles, runs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { searchQueries } from "@/lib/search";
import { ago, APP_STATUS, day, requestTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, ScoreBadge, Stat } from "@/components/ui";
import { RunSearchButton } from "@/components/run-search";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const uid = user.id;
  const now = requestTime();
  const [[profile], [prefs], recentRuns, top, [jobStats], appStats, followUps] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, uid)),
    db.select().from(preferences).where(eq(preferences.userId, uid)),
    db.select().from(runs).where(eq(runs.userId, uid)).orderBy(desc(runs.startedAt)).limit(5),
    db.select().from(jobs).where(and(eq(jobs.userId, uid), inArray(jobs.status, ["new", "saved"]))).orderBy(desc(jobs.score), desc(jobs.createdAt)).limit(6),
    db.select({
      total: sql<number>`count(*)::int`,
      strong: sql<number>`count(*) filter (where ${jobs.score} >= 70 and ${jobs.status} <> 'hidden')::int`,
      fresh: sql<number>`count(*) filter (where ${jobs.createdAt} > now() - interval '7 days' and ${jobs.status} <> 'hidden')::int`,
      saved: sql<number>`count(*) filter (where ${jobs.status} = 'saved')::int`,
    }).from(jobs).where(eq(jobs.userId, uid)),
    db.select({ status: applications.status, n: sql<number>`count(*)::int` }).from(applications).where(eq(applications.userId, uid)).groupBy(applications.status),
    db.select().from(applications).where(and(eq(applications.userId, uid), inArray(applications.status, ["applied", "interviewing"]), lte(applications.followUpAt, new Date(now + 3 * 86_400_000)))).orderBy(applications.followUpAt).limit(5),
  ]);
  const apps = (s: string) => appStats.find((a) => a.status === s)?.n ?? 0;
  const totalApps = appStats.reduce((a, b) => a + b.n, 0);
  const queries = searchQueries(profile, prefs);

  const steps = [
    { done: Boolean(profile?.cvText), label: "Upload your CV", href: "/profile" },
    { done: Boolean(prefs?.keywords?.length), label: "Set what you're looking for", href: "/preferences" },
    { done: recentRuns.length > 0, label: "Run your first search", href: "/jobs" },
    { done: totalApps > 0, label: "Track your first application", href: "/jobs" },
  ];
  const onboarding = steps.some((s) => !s.done);
  const first = (user.name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={first ? `Salam, ${first}` : "Dashboard"}
        description={recentRuns[0] ? `Last search ${ago(recentRuns[0].startedAt)}.` : "Let's get your job search running."}
        actions={<RunSearchButton compact disabledReason={queries.length ? undefined : "Add job titles in Preferences first"} />}
      />

      {onboarding && (
        <Card className="mb-5 p-5">
          <h2 className="font-semibold">Get set up</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className={cn("flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm", s.done ? "border-accent/30 bg-accent-soft/50 text-accent-2" : "border-line hover:border-line-2")}>
                  {s.done ? <Check className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0 text-mute" />}
                  <span><span className="num mr-1 text-xs text-mute">{i + 1}.</span>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Strong matches" value={jobStats?.strong ?? 0} hint="Score 70 or more" href="/jobs?min=70" />
        <Stat label="New this week" value={jobStats?.fresh ?? 0} hint={`${jobStats?.total ?? 0} jobs in total`} href="/jobs?sort=new" />
        <Stat label="Applications" value={totalApps} hint={`${apps("interviewing")} interviewing · ${apps("offer")} offers`} href="/applications" />
        <Stat label="Saved jobs" value={jobStats?.saved ?? 0} hint="Shortlisted to apply" href="/jobs?tab=saved" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Best matches right now" action={<Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink">All jobs <ArrowRight className="size-3.5" /></Link>} />
          {top.length ? (
            <ul className="divide-y divide-line">
              {top.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper/60">
                    <ScoreBadge score={j.score} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{j.title}</span>
                      <span className="block truncate text-sm text-mute">{j.company}{j.location ? ` · ${j.location}` : ""}</span>
                    </span>
                    {j.status === "saved" && <Badge tone="good">Saved</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Radar className="size-5" />} title="No matches yet">
              {queries.length ? "Run a search and your best-fitting jobs will appear here." : "Upload your CV and set your target titles first."}
            </EmptyState>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Follow-ups due" />
            {followUps.length ? (
              <ul className="divide-y divide-line">
                {followUps.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <div className="font-medium">{a.company}</div>
                    <div className="text-mute">{a.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={a.followUpAt && a.followUpAt.getTime() < now ? "bad" : "warn"}><BellRing className="size-3" />{day(a.followUpAt)}</Badge>
                      <Badge tone={APP_STATUS[a.status]?.tone}>{APP_STATUS[a.status]?.label}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-mute">Nothing due in the next 3 days.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent searches" />
            {recentRuns.length ? (
              <ul className="divide-y divide-line">
                {recentRuns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{r.queries.join(", ")}</span>
                      <span className="text-xs text-mute">{ago(r.startedAt)}{r.trigger === "scheduled" ? " · daily" : ""}</span>
                    </span>
                    {r.status === "completed" ? (
                      <span className="num shrink-0 text-xs text-mute">+{r.jobsNew} new</span>
                    ) : (
                      <Badge tone={r.status === "failed" ? "bad" : "warn"}>{r.status}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-mute">No searches yet.</p>
            )}
          </Card>
          {!profile?.cvText && <ButtonLink href="/profile" className="w-full">Upload your CV</ButtonLink>}
        </div>
      </div>
    </>
  );
}

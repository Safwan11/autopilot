import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, MapPin, Banknote, Clock, Building2, Briefcase } from "lucide-react";
import { db } from "@/db";
import { answers, applications, jobs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { scoreLabel, WEIGHTS } from "@/lib/matcher";
import { ago, APP_STATUS } from "@/lib/format";
import { Badge, Card, Chips, Meter, ScoreBadge } from "@/components/ui";
import { ApplyPanel } from "@/components/apply-panel";
import { JobQuickActions } from "@/components/job-actions";
import { CopyButton } from "@/components/copy-button";

export default async function JobPage(props: PageProps<"/jobs/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, user.id)));
  if (!job) notFound();
  const [[app], savedAnswers] = await Promise.all([
    db.select().from(applications).where(and(eq(applications.jobId, job.id), eq(applications.userId, user.id))),
    db.select().from(answers).where(eq(answers.userId, user.id)).orderBy(desc(answers.updatedAt)).limit(6),
  ]);
  const b = job.breakdown;

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"><ArrowLeft className="size-4" />All jobs</Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex gap-4">
              <ScoreBadge score={job.score} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{job.title}</h1>
                  <JobQuickActions id={job.id} status={job.status} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-ink-2"><Building2 className="size-4 text-mute" />{job.company}</div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-mute">
                  {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{job.location}</span>}
                  {job.remoteType && <Badge tone={job.remoteType === "Remote" ? "info" : "neutral"}>{job.remoteType}</Badge>}
                  {job.employmentType && <span className="inline-flex items-center gap-1 capitalize"><Briefcase className="size-3.5" />{job.employmentType}</span>}
                  {job.salary && <span className="inline-flex items-center gap-1"><Banknote className="size-3.5" />{job.salary}</span>}
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{job.postedAt ? `Posted ${ago(job.postedAt)}` : `Found ${ago(job.createdAt)}`}</span>
                  <span>via {job.source}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{scoreLabel(job.score)} match</h2>
              {job.aiScored && <Badge>Scored by Claude</Badge>}
            </div>
            {job.reasoning && <p className="mt-2 text-sm text-ink-2">{job.reasoning}</p>}
            {b && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Meter label={`Skills (${WEIGHTS.skills * 100}%)`} value={b.skills} />
                <Meter label={`Job title (${WEIGHTS.title * 100}%)`} value={b.title} />
                <Meter label={`Location & mode (${WEIGHTS.location * 100}%)`} value={b.location} />
                <Meter label={`Seniority (${WEIGHTS.seniority * 100}%)`} value={b.seniority} />
              </div>
            )}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-mute">You have</h3>
                {job.matchedSkills.length ? <Chips items={job.matchedSkills} tone="good" /> : <p className="text-sm text-mute">No direct skill overlap found.</p>}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-mute">It also asks for</h3>
                {job.missingSkills.length ? <Chips items={job.missingSkills} tone="warn" /> : <p className="text-sm text-mute">No obvious gaps.</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-3 font-semibold">Job description</h2>
            {job.tags.length > 0 && <div className="mb-4"><Chips items={job.tags} max={12} /></div>}
            <div className="prose-job text-[15px] text-ink-2">{job.description || "No description provided. Open the application page for details."}</div>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            {app && (
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-mute">Application</span>
                <Link href="/applications"><Badge tone={APP_STATUS[app.status]?.tone}>{APP_STATUS[app.status]?.label}</Badge></Link>
              </div>
            )}
            <ApplyPanel jobId={job.id} applyUrl={job.applyUrl || job.url} applied={Boolean(app)} aiAvailable={aiEnabled()} />
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Saved answers</h3>
              <Link href="/answers" className="text-xs text-mute hover:text-ink">Manage</Link>
            </div>
            {savedAnswers.length ? (
              <ul className="mt-2 divide-y divide-line">
                {savedAnswers.map((a) => (
                  <li key={a.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{a.question}</span>
                      <CopyButton text={a.answer} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-mute">{a.answer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-mute">Save answers to common application questions (notice period, salary, why this company) and copy them here.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

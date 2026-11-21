import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ExternalLink, KanbanSquare, Plus, BellRing } from "lucide-react";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago, APP_STATUS, day, requestTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, PageHeader, ButtonLink } from "@/components/ui";
import { EditApplicationForm, NewApplicationForm, StatusSelect } from "@/components/tracker";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const filter = typeof sp.status === "string" && APP_STATUS[sp.status] ? sp.status : "";
  const all = await db.select().from(applications).where(eq(applications.userId, user.id)).orderBy(desc(applications.appliedAt));
  const list = filter ? all.filter((a) => a.status === filter) : all;
  const now = requestTime();

  return (
    <>
      <PageHeader title="Applications" description="Every job you've applied to, with status and follow-up dates." />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.entries(APP_STATUS).map(([k, v]) => {
          const n = all.filter((a) => a.status === k).length;
          return (
            <Link key={k} href={filter === k ? "/applications" : `/applications?status=${k}`} className={cn("rounded-xl border bg-card px-3.5 py-3 transition-colors", filter === k ? "border-ink" : "border-line hover:border-line-2")}>
              <div className="text-xs text-mute">{v.label}</div>
              <div className="num mt-0.5 text-xl font-semibold">{n}</div>
            </Link>
          );
        })}
      </div>

      <details className="group mb-5 rounded-xl border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium">
          <Plus className="size-4 transition-transform group-open:rotate-45" /> Add an application you made elsewhere
        </summary>
        <div className="border-t border-line"><NewApplicationForm /></div>
      </details>

      <Card>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((a) => {
              const overdue = a.followUpAt && a.followUpAt.getTime() < now && ["applied", "interviewing"].includes(a.status);
              return (
                <li key={a.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {a.jobId ? <Link href={`/jobs/${a.jobId}`} className="font-medium hover:underline underline-offset-4">{a.title}</Link> : <span className="font-medium">{a.title}</span>}
                        {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-mute hover:text-ink" aria-label="Open posting"><ExternalLink className="size-3.5" /></a>}
                      </div>
                      <div className="text-sm text-ink-2">{a.company}{a.location ? ` · ${a.location}` : ""}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                        <span>Applied {day(a.appliedAt)}</span>
                        {a.followUpAt && (
                          <Badge tone={overdue ? "bad" : "neutral"}><BellRing className="size-3" />{overdue ? `Follow up was due ${ago(a.followUpAt)}` : `Follow up ${day(a.followUpAt)}`}</Badge>
                        )}
                        {a.coverLetter && <Badge>Cover letter saved</Badge>}
                      </div>
                    </div>
                    <StatusSelect id={a.id} status={a.status} />
                  </div>
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-xs font-medium text-mute hover:text-ink">
                      <span className="group-open:hidden">Notes & details{a.notes ? " ✎" : ""}</span><span className="hidden group-open:inline">Hide details</span>
                    </summary>
                    <EditApplicationForm app={a} />
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<KanbanSquare className="size-5" />} title={filter ? `No ${APP_STATUS[filter].label.toLowerCase()} applications` : "No applications yet"} action={!filter && <ButtonLink href="/jobs" variant="secondary">Browse matched jobs</ButtonLink>}>
            {!filter && "When you apply to a job, press “I've applied” on its page and it shows up here."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { Download, Search, Briefcase } from "lucide-react";
import { db } from "@/db";
import { jobs, preferences, profiles, runs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ALL_SOURCES, AUTO_SOURCES, enabledAuto, enabledLinks } from "@/lib/sources";
import { resolveCountries } from "@/lib/countries";
import { QuickLinks, type LinkMatrix } from "@/components/quick-links";
import { searchQueries } from "@/lib/search";
import { ago } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ButtonLink, Card, EmptyState, Input, PageHeader, Select, Button } from "@/components/ui";
import { RunSearchButton } from "@/components/run-search";
import { JobRow } from "@/components/job-card";
import { clearHiddenJobs } from "@/app/actions/jobs";

export const metadata = { title: "Jobs" };
const PAGE = 25;

const TABS = [
  { id: "active", label: "All open" },
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "hidden", label: "Hidden" },
];

export default async function JobsPage(props: PageProps<"/jobs">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const tab = TABS.some((t) => t.id === one("tab")) ? one("tab") : "active";
  const q = one("q").trim();
  const min = Number(one("min")) || 0;
  const mode = one("mode");
  const source = one("source");
  const sort = one("sort") === "new" ? "new" : "score";
  const page = Math.max(1, Number(one("page")) || 1);

  const conds: SQL[] = [eq(jobs.userId, user.id)];
  if (tab === "active") conds.push(sql`${jobs.status} in ('new','saved')`);
  else conds.push(eq(jobs.status, tab));
  if (q) conds.push(or(ilike(jobs.title, `%${q}%`), ilike(jobs.company, `%${q}%`), ilike(jobs.location, `%${q}%`))!);
  if (min) conds.push(gte(jobs.score, min));
  if (mode) conds.push(eq(jobs.remoteType, mode));
  if (source) conds.push(eq(jobs.source, source));
  const where = and(...conds);

  const [[profile], [prefs], [lastRun], list, [{ total }], counts] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
    db.select().from(preferences).where(eq(preferences.userId, user.id)),
    db.select().from(runs).where(eq(runs.userId, user.id)).orderBy(desc(runs.startedAt)).limit(1),
    db.select().from(jobs).where(where)
      .orderBy(...(sort === "new" ? [desc(jobs.createdAt), desc(jobs.score)] : [desc(jobs.score), desc(jobs.createdAt)]))
      .limit(PAGE).offset((page - 1) * PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(jobs).where(where),
    db.select({ status: jobs.status, n: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.userId, user.id)).groupBy(jobs.status),
  ]);
  const count = (s: string) => counts.filter((c) => (s === "active" ? ["new", "saved"].includes(c.status) : c.status === s)).reduce((a, c) => a + c.n, 0);
  const queries = searchQueries(profile, prefs);
  const countries = resolveCountries(prefs?.locations).slice(0, 4);
  const places = [...countries.map((c) => ({ code: c.code, name: c.name })), { code: "", name: "Anywhere" }];
  const linkMatrix: LinkMatrix = {
    keywords: queries,
    places,
    links: enabledLinks(prefs?.linkSources).map((l) => ({
      id: l.id, name: l.name, region: l.region,
      urls: Object.fromEntries(queries.flatMap((kw, i) => places.map((p) => [`${i}|${p.code}`, l.url(kw, countries.find((c) => c.code === p.code) ?? null)]))),
    })),
  };
  const sourceNames = [...new Set(ALL_SOURCES.filter((x) => x.kind === "auto").map((x) => x.name))];
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab, q, min: min || "", mode, source, sort: sort === "score" ? "" : sort, page: "", ...patch };
    Object.entries(merged).forEach(([k, v]) => v !== "" && v != null && p.set(k, String(v)));
    return `/jobs${p.size ? `?${p}` : ""}`;
  };
  const filtered = Boolean(q || min || mode || source);

  return (
    <>
      <PageHeader
        title="Jobs"
        description={lastRun ? <>Last search {ago(lastRun.startedAt)} for <span className="text-ink-2">{lastRun.queries.join(", ")}</span>.</> : "Run your first search to fill this list."}
        actions={
          <>
            <ButtonLink href="/api/export" variant="secondary" prefetch={false}><Download className="size-4" />Excel</ButtonLink>
            <RunSearchButton
              compact
              disabledReason={queries.length ? undefined : "Add job titles in Preferences first"}
              sources={AUTO_SOURCES.map(({ id, name, region }) => ({ id, name, region }))}
              defaultOn={enabledAuto(prefs?.sources).map((x) => x.id)}
            />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <Link key={t.id} href={qs({ tab: t.id, page: "" })} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.id ? "border-ink font-medium text-ink" : "border-transparent text-mute hover:text-ink")}>
                {t.label} <span className="num ml-1 text-xs text-mute">{count(t.id)}</span>
              </Link>
            ))}
          </div>

          <form className="flex flex-wrap gap-2" action="/jobs">
            <input type="hidden" name="tab" value={tab} />
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-mute" />
              <Input name="q" defaultValue={q} placeholder="Title, company or location" className="pl-8" />
            </div>
            <Select name="min" defaultValue={String(min || "")} className="w-auto">
              <option value="">Any score</option>
              <option value="85">85+ excellent</option>
              <option value="70">70+ strong</option>
              <option value="55">55+ good</option>
            </Select>
            <Select name="mode" defaultValue={mode} className="w-auto">
              <option value="">Any mode</option>
              <option>Remote</option><option>Hybrid</option><option>Onsite</option>
            </Select>
            <Select name="source" defaultValue={source} className="w-auto">
              <option value="">All sources</option>
              {sourceNames.map((n) => <option key={n}>{n}</option>)}
            </Select>
            <Select name="sort" defaultValue={sort} className="w-auto">
              <option value="score">Best match</option>
              <option value="new">Newest</option>
            </Select>
            <Button type="submit" variant="secondary">Apply</Button>
            {filtered && <ButtonLink href={qs({ q: "", min: "", mode: "", source: "" })} variant="ghost">Clear</ButtonLink>}
          </form>

          <Card>
            {list.length ? (
              <ul className="divide-y divide-line">{list.map((j) => <JobRow key={j.id} job={j} />)}</ul>
            ) : (
              <EmptyState icon={<Briefcase className="size-5" />} title={filtered ? "No jobs match these filters" : tab === "active" ? "No jobs yet" : `Nothing ${tab} yet`}>
                {tab === "active" && !filtered ? (queries.length ? "Run a search to pull in jobs from all sources." : "Upload your CV or add job titles in Preferences, then run a search.") : null}
              </EmptyState>
            )}
          </Card>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-mute">Page {page} of {pages} · {total} jobs</span>
              <div className="flex gap-2">
                {page > 1 && <ButtonLink variant="secondary" href={qs({ page: page - 1 })}>Previous</ButtonLink>}
                {page < pages && <ButtonLink variant="secondary" href={qs({ page: page + 1 })}>Next</ButtonLink>}
              </div>
            </div>
          )}
          {tab === "hidden" && list.length > 0 && (
            <form action={clearHiddenJobs} className="flex justify-end">
              <Button variant="danger" type="submit">Delete all hidden jobs</Button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Search other sites</h3>
            <p className="mt-1 mb-3 text-xs text-mute">Open your search on sites that block automated search. Choose which in <Link href="/preferences" className="underline">Preferences</Link>.</p>
            {queries.length ? (
              linkMatrix.links.length ? <QuickLinks data={linkMatrix} /> : <p className="text-sm text-mute">All quick-search sites are turned off.</p>
            ) : (
              <p className="text-sm text-mute">Add search titles in <Link href="/preferences" className="underline">Preferences</Link>.</p>
            )}
          </Card>
          {lastRun && Object.keys(lastRun.sourceStats ?? {}).length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Last search by source</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {Object.entries(lastRun.sourceStats).map(([name, s]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="text-ink-2">{name}</span>
                    <span className={cn("num text-xs", s.error ? "text-bad" : "text-mute")}>{s.error ? (/40[13]|429/.test(s.error) ? "blocked" : "no response") : `${s.found} found · ${s.kept} new`}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

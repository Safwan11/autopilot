import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { Download, Puzzle, MousePointerClick, KeyRound, Search } from "lucide-react";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/format";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { TokenBox } from "@/components/token-box";

export const metadata = { title: "Browser importer" };

export default async function ImporterPage() {
  const user = await requireUser();
  const h = await headers();
  const appUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const imports = await db.select().from(runs).where(and(eq(runs.userId, user.id), eq(runs.trigger, "import"))).orderBy(desc(runs.startedAt)).limit(8);

  const steps = [
    { icon: Download, title: "Download the extension", body: <>Click <b>Download extension</b> and unzip the file. You&apos;ll get a folder called <b>jobpilot-extension</b>.</> },
    { icon: Puzzle, title: "Add it to Chrome or Edge", body: <>Open <code>chrome://extensions</code> (or <code>edge://extensions</code>), turn on <b>Developer mode</b>, click <b>Load unpacked</b> and pick the folder. Pin the JobPilot icon to your toolbar.</> },
    { icon: KeyRound, title: "Connect it to your account", body: <>Create a token below, click the JobPilot icon, paste the token and press <b>Save &amp; test</b>.</> },
    { icon: Search, title: "Open a search", body: <>Use the links under <b>Search other sites</b> on the Jobs page to open Bayt, GulfTalent or Wuzzuf with your titles and country.</> },
    { icon: MousePointerClick, title: "Send the jobs", body: <>Click the JobPilot icon → <b>Send to JobPilot</b>. Jobs land in your list, scored against your CV. Also works on any single job page (LinkedIn, Glassdoor, Naukrigulf, company career sites).</> },
  ];

  return (
    <>
      <PageHeader
        title="Browser importer"
        description="Bayt, GulfTalent and Wuzzuf block searches from JobPilot's server. This small browser extension reads the jobs you're already looking at in your own browser and sends them to JobPilot in one click."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Set up (2 minutes)" action={<a href="/jobpilot-extension.zip" download className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink px-3.5 text-sm font-medium text-white hover:bg-ink-2"><Download className="size-4" />Download extension</a>} />
          <ol className="divide-y divide-line">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 px-5 py-4">
                <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-semibold">{i + 1}</span>
                <div>
                  <div className="flex items-center gap-2 font-medium"><s.icon className="size-4 text-accent" />{s.title}</div>
                  <p className="mt-1 text-sm text-ink-2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <aside className="space-y-5">
          <Card>
            <CardHeader title="Your importer token" description="Lets the extension add jobs to your account only." />
            <div className="p-5">
              <TokenBox hasToken={Boolean(user.importTokenHash)} createdLabel={user.importTokenCreatedAt ? ago(user.importTokenCreatedAt) : null} appUrl={appUrl} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Recent imports" />
            {imports.length ? (
              <ul className="divide-y divide-line text-sm">
                {imports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate">{Object.keys(r.sourceStats ?? {})[0] ?? "Import"}</span>
                      <span className="text-xs text-mute">{ago(r.startedAt)}</span>
                    </span>
                    <span className="num shrink-0 text-xs text-mute">+{r.jobsNew} of {r.jobsFound}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-mute">Nothing imported yet.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

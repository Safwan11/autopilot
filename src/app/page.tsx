import { redirect } from "next/navigation";
import { ArrowRight, FileText, Radar, Gauge, PenLine, KanbanSquare, FileSpreadsheet } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ButtonLink, Notice } from "@/components/ui";

const FEATURES = [
  { icon: FileText, title: "Reads your CV", body: "Upload a PDF or Word CV. JobPilot pulls out your titles, skills, experience and contact details into a profile you can edit." },
  { icon: Radar, title: "Searches for you", body: "Searches LinkedIn, Bayt, GulfTalent, Wuzzuf and five remote-job boards in your countries, plus one-click searches on Glassdoor, Indeed, Naukrigulf and more." },
  { icon: Gauge, title: "Scores every role", body: "Each job gets a 0–100 match on skills, title, location and seniority, with the gaps spelled out. Add an AI key for Claude-powered scoring." },
  { icon: PenLine, title: "Drafts cover letters", body: "Tailored letters from your real experience, plus a library of saved answers for those repeated application questions." },
  { icon: KanbanSquare, title: "Tracks applications", body: "Applied, interviewing, offer, rejected. Follow-up reminders so nothing goes quiet without you noticing." },
  { icon: FileSpreadsheet, title: "Exports to Excel", body: "One click gives you a formatted workbook of every job, application and search, ready to filter or share." },
];

export default async function Home(props: PageProps<"/">) {
  if (await getUser()) redirect("/dashboard");
  const sp = await props.searchParams;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
          <ButtonLink href="/signup">Get started</ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {sp.deleted && <div className="mb-6"><Notice tone="good">Your account and all its data were deleted.</Notice></div>}
        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-2 bg-card px-3 py-1 text-xs font-medium text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" /> Your personal job-search agent
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Upload your CV once.<br />Let JobPilot find the jobs worth applying to.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              It searches job boards, scores every role against your experience, writes the cover letter and keeps track of where you applied.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="h-11 px-5 text-[15px]">Create free account <ArrowRight className="size-4" /></ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="h-11 px-5 text-[15px]">I have an account</ButtonLink>
            </div>
          </div>
          <PreviewCard />
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="py-12 text-center text-sm text-mute">JobPilot · built by Muslim Tech</footer>
      </main>
    </div>
  );
}

function PreviewCard() {
  const rows = [
    { t: "Application Support Engineer", c: "Fintech · Remote, EMEA", s: 91 },
    { t: "QA Analyst (ERP)", c: "Retail group · Riyadh", s: 84 },
    { t: "Oracle Fusion Support Consultant", c: "Consultancy · Dubai", s: 77 },
    { t: "Senior SDET", c: "SaaS · Remote, US", s: 48 },
  ];
  return (
    <div className="rounded-2xl border border-line bg-card p-2 shadow-[0_30px_60px_-30px_rgba(21,23,28,0.25)]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Top matches</span>
        <span className="num text-xs text-mute">124 found · 18 strong</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.t} className="flex items-center gap-3 px-4 py-3">
            <span className={`num flex size-10 items-center justify-center rounded-lg border text-sm font-semibold ${r.s >= 70 ? "border-accent/40 bg-accent-soft text-accent-2" : "border-warn/40 bg-warn-soft text-warn"}`}>{r.s}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{r.t}</span>
              <span className="block truncate text-xs text-mute">{r.c}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

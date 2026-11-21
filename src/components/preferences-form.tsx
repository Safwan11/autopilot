"use client";
import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { savePreferences, type FormState } from "@/app/actions/settings";
import { Checkbox, Field, Input, Textarea } from "./ui";
import { FormMessage, SubmitButton, useStickyForm } from "./form-bits";

type Prefs = {
  keywords: string[]; locations: string[]; remote: boolean; hybrid: boolean; onsite: boolean; minScore: number;
  maxAgeDays: number; excludeKeywords: string[]; excludeCompanies: string[]; autoSearch: boolean;
  autoOn: string[]; linksOn: string[];
};
type Src = { id: string; name: string; description: string; region: string };

const QUICK_LOCATIONS = ["Egypt", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Oman", "Bahrain", "Jordan", "Remote"];

export function PreferencesForm({ prefs, autoSources, linkSources, cronReady }: { prefs: Prefs; autoSources: Src[]; linkSources: Src[]; cronReady: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePreferences, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state);
  const locRef = useRef<HTMLInputElement>(null);

  const addLocation = (l: string) => {
    const el = locRef.current;
    if (!el) return;
    const list = el.value.split(",").map((x) => x.trim()).filter(Boolean);
    if (!list.some((x) => x.toLowerCase() === l.toLowerCase())) el.value = [...list, l].join(", ");
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="divide-y divide-line">
      <Section title="What to search for" text="Each title is searched on every site you turn on below.">
        <Field label="Job titles / keywords" hint="Up to 8, comma-separated. e.g. application support, QA engineer, Oracle Fusion support">
          <Textarea name="keywords" className="min-h-20" defaultValue={prefs.keywords.join(", ")} required />
        </Field>
        <Field label="Countries & cities" hint="LinkedIn, Bayt, GulfTalent and Wuzzuf search inside these (first 3 countries). Leave empty for anywhere.">
          <Input ref={locRef} name="locations" defaultValue={prefs.locations.join(", ")} />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {QUICK_LOCATIONS.map((l) => (
            <button key={l} type="button" onClick={() => addLocation(l)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-line-2 hover:bg-paper">
              <Plus className="size-3" />{l}
            </button>
          ))}
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Work mode</span>
          <div className="grid gap-2 sm:grid-cols-3">
            <Checkbox name="remote" label="Remote" defaultChecked={prefs.remote} />
            <Checkbox name="hybrid" label="Hybrid" defaultChecked={prefs.hybrid} />
            <Checkbox name="onsite" label="On-site" defaultChecked={prefs.onsite} />
          </div>
        </div>
      </Section>

      <Section title="Sites JobPilot searches for you" text="Results from these land in your Jobs list, scored against your CV. You can also pick sites each time you search.">
        <SourceGroup sources={autoSources} prefix="source_" on={prefs.autoOn} />
      </Section>

      <Section title="Quick-search links" text="These sites block automated search, so JobPilot opens your search on them in one click (from the Jobs page).">
        <SourceGroup sources={linkSources} prefix="link_" on={prefs.linksOn} />
      </Section>

      <Section title="Filtering" text="Exclusions hide jobs automatically; you can still find them under “Hidden”.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="“Good match” threshold" hint="Score 0–100. Used for counts and highlights.">
            <Input name="minScore" type="number" min={0} max={100} defaultValue={prefs.minScore} />
          </Field>
          <Field label="Ignore jobs older than (days)">
            <Input name="maxAgeDays" type="number" min={1} max={120} defaultValue={prefs.maxAgeDays} />
          </Field>
        </div>
        <Field label="Exclude jobs mentioning" hint="e.g. US citizens only, security clearance, unpaid">
          <Input name="excludeKeywords" defaultValue={prefs.excludeKeywords.join(", ")} />
        </Field>
        <Field label="Exclude companies">
          <Input name="excludeCompanies" defaultValue={prefs.excludeCompanies.join(", ")} />
        </Field>
      </Section>

      <Section title="Daily search" text="Runs your search automatically every morning (05:00 UTC).">
        <Checkbox name="autoSearch" label="Search for new jobs every day" hint={cronReady ? "New matches appear on your dashboard." : "Needs CRON_SECRET to be set in Vercel before it can run."} defaultChecked={prefs.autoSearch} />
      </Section>

      <div className="space-y-3 p-5">
        <FormMessage state={state} />
        <div className="flex justify-end"><SubmitButton pending={pending} pendingText="Saving…">Save preferences</SubmitButton></div>
      </div>
    </form>
  );
}

export function SourceGroup({ sources, prefix, on }: { sources: Src[]; prefix: string; on: string[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(on));
  const all = checked.size === sources.length;
  const regions = [...new Set(sources.map((s) => s.region))];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mute">{checked.size} of {sources.length} selected</span>
        <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setChecked(all ? new Set() : new Set(sources.map((s) => s.id)))}>
          {all ? "Clear all" : "Select all"}
        </button>
      </div>
      {regions.map((r) => (
        <div key={r}>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-mute">{r}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.filter((s) => s.region === r).map((s) => (
              <Checkbox
                key={s.id}
                name={`${prefix}${s.id}`}
                label={s.name}
                hint={s.description}
                checked={checked.has(s.id)}
                onChange={(e) => {
                  const next = new Set(checked);
                  if (e.target.checked) next.add(s.id); else next.delete(s.id);
                  setChecked(next);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-mute">{text}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

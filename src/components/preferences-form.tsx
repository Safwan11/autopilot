"use client";
import { useActionState } from "react";
import { savePreferences, type FormState } from "@/app/actions/settings";
import { Checkbox, Field, Input, Textarea } from "./ui";
import { FormMessage, SubmitButton, useStickyForm } from "./form-bits";

type Prefs = {
  keywords: string[]; locations: string[]; remote: boolean; hybrid: boolean; onsite: boolean; minScore: number;
  maxAgeDays: number; excludeKeywords: string[]; excludeCompanies: string[]; sources: string[]; autoSearch: boolean;
};

export function PreferencesForm({ prefs, sources, cronReady }: { prefs: Prefs; sources: { id: string; name: string; description: string }[]; cronReady: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePreferences, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="divide-y divide-line">
      <Section title="What to search for" text="Each line or comma-separated item is searched on every source.">
        <Field label="Job titles / keywords" hint="Up to 8. e.g. application support, QA engineer, Oracle Fusion support">
          <Textarea name="keywords" className="min-h-20" defaultValue={prefs.keywords.join(", ")} required />
        </Field>
        <Field label="Preferred locations" hint="Countries or cities, e.g. Saudi Arabia, Riyadh, UAE, Egypt. Leave empty for anywhere.">
          <Input name="locations" defaultValue={prefs.locations.join(", ")} />
        </Field>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Work mode</span>
          <div className="grid gap-2 sm:grid-cols-3">
            <Checkbox name="remote" label="Remote" defaultChecked={prefs.remote} />
            <Checkbox name="hybrid" label="Hybrid" defaultChecked={prefs.hybrid} />
            <Checkbox name="onsite" label="On-site" defaultChecked={prefs.onsite} />
          </div>
        </div>
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

      <Section title="Job sources" text="Free public job APIs. Turn off any you don't want.">
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((s) => (
            <Checkbox key={s.id} name={`source_${s.id}`} label={s.name} hint={s.description} defaultChecked={!prefs.sources.length || prefs.sources.includes(s.id)} />
          ))}
        </div>
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

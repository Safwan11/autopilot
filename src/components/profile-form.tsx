"use client";
import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/actions/settings";
import type { Profile } from "@/db/schema";
import { Field, Input, Textarea } from "./ui";
import { FormMessage, SubmitButton, useStickyForm } from "./form-bits";

export function ProfileForm({ profile, fallbackName, fallbackEmail }: { profile?: Profile; fallbackName: string; fallbackEmail: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state);
  const p = profile;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input name="fullName" defaultValue={p?.fullName ?? fallbackName} /></Field>
        <Field label="Headline" hint="Your main title, e.g. Software Support & QA Engineer"><Input name="headline" defaultValue={p?.headline ?? ""} /></Field>
        <Field label="Email"><Input name="email" type="email" defaultValue={p?.email ?? fallbackEmail} /></Field>
        <Field label="Phone"><Input name="phone" defaultValue={p?.phone ?? ""} /></Field>
        <Field label="Location"><Input name="location" defaultValue={p?.location ?? ""} placeholder="Giza, Egypt" /></Field>
        <Field label="Years of experience"><Input name="yearsExperience" type="number" min={0} max={50} defaultValue={p?.yearsExperience ?? ""} /></Field>
        <Field label="LinkedIn"><Input name="linkedin" defaultValue={p?.linkedin ?? ""} placeholder="linkedin.com/in/…" /></Field>
        <Field label="Website / portfolio"><Input name="website" defaultValue={p?.website ?? ""} /></Field>
      </div>
      <Field label="Job titles you've held or want" hint="Comma-separated. Used for matching and as default search terms.">
        <Textarea name="titles" className="min-h-16" defaultValue={(p?.titles ?? []).join(", ")} />
      </Field>
      <Field label="Skills" hint="Comma-separated. The more accurate this list, the better the match scores.">
        <Textarea name="skills" defaultValue={(p?.skills ?? []).join(", ")} />
      </Field>
      <Field label="Languages" hint="Comma-separated."><Input name="languages" defaultValue={(p?.languages ?? []).join(", ")} /></Field>
      <Field label="Summary" hint="Used in cover letters.">
        <Textarea name="summary" className="min-h-28" defaultValue={p?.summary ?? ""} />
      </Field>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingText="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}

"use client";
import { useActionState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { createApplication, deleteApplication, setApplicationStatus, updateApplication, saveAnswer, deleteAnswer, type FormState } from "@/app/actions/tracker";
import { APP_STATUS, inputDate } from "@/lib/format";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { FormMessage, SubmitButton, useStickyForm } from "./form-bits";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1.5">
      <Select
        defaultValue={status}
        onChange={(e) => start(() => setApplicationStatus(id, e.target.value))}
        className="h-8 w-36 text-[13px]"
        aria-label="Status"
      >
        {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </Select>
      {pending && <Loader2 className="size-4 animate-spin text-mute" />}
    </div>
  );
}

export function NewApplicationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createApplication, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state, true);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 p-5 sm:grid-cols-2">
      <Field label="Company"><Input name="company" required /></Field>
      <Field label="Job title"><Input name="title" required /></Field>
      <Field label="Link"><Input name="url" type="url" placeholder="https://" /></Field>
      <Field label="Location"><Input name="location" /></Field>
      <Field label="Status">
        <Select name="status" defaultValue="applied">{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Applied on"><Input name="appliedAt" type="date" defaultValue={inputDate(new Date())} /></Field>
        <Field label="Follow up on"><Input name="followUpAt" type="date" /></Field>
      </div>
      <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" className="min-h-16" /></Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="ml-auto" pendingText="Adding…">Add application</SubmitButton>
      </div>
    </form>
  );
}

type App = { id: string; status: string; followUpAt: Date | null; contact: string | null; salary: string | null; notes: string | null; coverLetter: string | null };

export function EditApplicationForm({ app }: { app: App }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateApplication, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state);
  const [delPending, startDel] = useTransition();
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 pt-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={app.id} />
      <input type="hidden" name="status" value={app.status} />
      <Field label="Follow up on"><Input name="followUpAt" type="date" defaultValue={inputDate(app.followUpAt)} /></Field>
      <Field label="Contact person"><Input name="contact" defaultValue={app.contact ?? ""} placeholder="Name, email" /></Field>
      <Field label="Salary discussed"><Input name="salary" defaultValue={app.salary ?? ""} /></Field>
      <div />
      <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" defaultValue={app.notes ?? ""} className="min-h-20" /></Field>
      <Field label="Cover letter sent" className="sm:col-span-2"><Textarea name="coverLetter" defaultValue={app.coverLetter ?? ""} className="min-h-20 text-[13px]" /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Button type="button" variant="danger" className="h-8" disabled={delPending} onClick={() => { if (confirm("Delete this application?")) startDel(() => deleteApplication(app.id)); }}>
          <Trash2 className="size-4" />Delete
        </Button>
        <div className="flex items-center gap-3">
          <FormMessage state={state} />
          <SubmitButton pending={pending} className="h-8" pendingText="Saving…">Save</SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function AnswerForm({ answer, onDoneLabel = "Save answer" }: { answer?: { id: string; question: string; answer: string }; onDoneLabel?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAnswer, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state, !answer);
  const [delPending, startDel] = useTransition();
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      {answer && <input type="hidden" name="id" value={answer.id} />}
      <Field label="Question"><Input name="question" defaultValue={answer?.question} required placeholder="What is your notice period?" /></Field>
      <Field label="Your answer"><Textarea name="answer" defaultValue={answer?.answer} required className="min-h-24" /></Field>
      <div className="flex items-center justify-between gap-3">
        {answer ? (
          <Button type="button" variant="danger" className="h-8" disabled={delPending} onClick={() => startDel(() => deleteAnswer(answer.id))}>
            <Trash2 className="size-4" />Delete
          </Button>
        ) : <span />}
        <div className="flex items-center gap-3">
          <FormMessage state={state} />
          <SubmitButton pending={pending} className="h-8" pendingText="Saving…">{onDoneLabel}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

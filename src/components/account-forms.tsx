"use client";
import { useActionState } from "react";
import { deleteAccount, updateAccount, type FormState } from "@/app/actions/settings";
import { Field, Input } from "./ui";
import { FormMessage, SubmitButton, useStickyForm } from "./form-bits";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAccount, undefined);
  const [formRef, onSubmit] = useStickyForm(action, state);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input name="name" defaultValue={name} /></Field>
        <Field label="Email" hint="Used to sign in."><Input value={email} disabled readOnly /></Field>
        <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" /></Field>
        <Field label="New password" hint="Leave empty to keep your current one."><Input name="newPassword" type="password" autoComplete="new-password" minLength={8} /></Field>
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end"><SubmitButton pending={pending} pendingText="Saving…">Save changes</SubmitButton></div>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-3 p-5">
      <p className="text-sm text-ink-2">Permanently deletes your account, profile, jobs, applications and answers. This can&apos;t be undone.</p>
      <Field label={`Type ${email} to confirm`}><Input name="confirm" autoComplete="off" /></Field>
      <FormMessage state={state} />
      <div className="flex justify-end"><SubmitButton variant="danger" pendingText="Deleting…">Delete my account</SubmitButton></div>
    </form>
  );
}

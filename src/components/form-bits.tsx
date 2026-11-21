"use client";
import { useEffect, useRef, useTransition, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, Notice } from "./ui";
import type { ComponentProps } from "react";

export function SubmitButton({ children, pendingText, pending: forced, ...p }: ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = forced ?? status.pending;
  return (
    <Button type="submit" disabled={pending || p.disabled} {...p}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingText ?? children : children}
    </Button>
  );
}

export function FormMessage({ state }: { state?: { ok?: string; error?: string } }) {
  if (!state) return null;
  if (state.error) return <Notice tone="bad">{state.error}</Notice>;
  if (state.ok) return <Notice tone="good">{state.ok}</Notice>;
  return null;
}

/**
 * Submits a form to a useActionState action without React's automatic form reset,
 * so a validation error never wipes what the user typed. Optionally clears the form after a success.
 */
export function useStickyForm(
  dispatch: (fd: FormData) => void,
  state: { ok?: string; error?: string } | undefined,
  resetOnSuccess = false,
) {
  const ref = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(() => dispatch(fd));
  };
  return [ref, onSubmit] as const;
}

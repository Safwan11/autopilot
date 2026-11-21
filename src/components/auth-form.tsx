"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { Card, Field, Input, Notice } from "./ui";
import { SubmitButton } from "./form-bits";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isLogin = mode === "login";
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-mute">{isLogin ? "Sign in to your job-search dashboard." : "Free. Your data stays private to your account."}</p>
      <form action={action} className="mt-6 space-y-4">
        {!isLogin && (
          <Field label="Your name"><Input name="name" autoComplete="name" required defaultValue={state?.name} /></Field>
        )}
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required defaultValue={state?.email} /></Field>
        <Field label="Password" hint={isLogin ? undefined : "At least 8 characters."}>
          <Input name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} />
        </Field>
        {state?.error && <Notice tone="bad">{state.error}</Notice>}
        <SubmitButton className="w-full h-10" pendingText={isLogin ? "Signing in…" : "Creating account…"}>
          {isLogin ? "Sign in" : "Create account"}
        </SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-mute">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-ink underline-offset-4 hover:underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </Card>
  );
}

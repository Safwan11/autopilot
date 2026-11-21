"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type AuthState = { error?: string; email?: string; name?: string } | undefined;

const SignUp = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  const keep = { email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, ...keep };
  const { name, email, password } = parsed.data;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length) return { error: "An account with this email already exists. Sign in instead.", ...keep };
  const [user] = await db.insert(users).values({ name, email, passwordHash: await hashPassword(password) }).returning();
  await createSession(user.id);
  redirect("/profile?welcome=1");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password", email };
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Wrong email or password", email };
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

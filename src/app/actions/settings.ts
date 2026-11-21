"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles, sessions, users } from "@/db/schema";
import { destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { splitList } from "@/lib/text";
import { rescoreAll } from "@/lib/search";
import { AUTO_SOURCES, LINK_SOURCES } from "@/lib/sources";

export type FormState = { ok?: string; error?: string } | undefined;

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  const n = v == null ? null : Number.parseInt(v, 10);
  return n == null || Number.isNaN(n) ? null : n;
};

export async function saveProfile(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = {
    fullName: str(f, "fullName"),
    headline: str(f, "headline"),
    email: str(f, "email"),
    phone: str(f, "phone"),
    location: str(f, "location"),
    linkedin: str(f, "linkedin"),
    website: str(f, "website"),
    yearsExperience: int(f, "yearsExperience"),
    summary: str(f, "summary"),
    titles: splitList(String(f.get("titles") ?? "")).slice(0, 12),
    skills: splitList(String(f.get("skills") ?? "")).slice(0, 80),
    languages: splitList(String(f.get("languages") ?? "")).slice(0, 12),
    updatedAt: new Date(),
  };
  await db.insert(profiles).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: profiles.userId, set: values });
  const n = await rescoreAll(user.id);
  revalidatePath("/", "layout");
  return { ok: n ? `Profile saved. Re-scored ${n} jobs.` : "Profile saved." };
}

export async function savePreferences(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const keywords = splitList(String(f.get("keywords") ?? "")).slice(0, 8);
  if (!keywords.length) return { error: "Add at least one job title or keyword to search for." };
  const picked = AUTO_SOURCES.map((s) => s.id).filter((id) => f.get(`source_${id}`) === "on");
  if (!picked.length) return { error: "Turn on at least one site for automatic search." };
  const sources = picked.length === AUTO_SOURCES.length ? [] : picked; // [] = all, so new sites are included automatically
  const links = LINK_SOURCES.map((s) => s.id).filter((id) => f.get(`link_${id}`) === "on");
  const linkSources = links.length === LINK_SOURCES.length ? null : links;
  const values = {
    keywords,
    locations: splitList(String(f.get("locations") ?? "")).slice(0, 12),
    remote: f.get("remote") === "on",
    hybrid: f.get("hybrid") === "on",
    onsite: f.get("onsite") === "on",
    minScore: Math.max(0, Math.min(100, int(f, "minScore") ?? 55)),
    maxAgeDays: Math.max(1, Math.min(120, int(f, "maxAgeDays") ?? 30)),
    excludeKeywords: splitList(String(f.get("excludeKeywords") ?? "")).slice(0, 30),
    excludeCompanies: splitList(String(f.get("excludeCompanies") ?? "")).slice(0, 30),
    sources,
    linkSources,
    autoSearch: f.get("autoSearch") === "on",
    updatedAt: new Date(),
  };
  await db.insert(preferences).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: preferences.userId, set: values });
  const n = await rescoreAll(user.id);
  revalidatePath("/", "layout");
  return { ok: n ? `Preferences saved. Re-scored ${n} jobs.` : "Preferences saved." };
}

export async function updateAccount(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(f, "name");
  const current = String(f.get("currentPassword") ?? "");
  const next = String(f.get("newPassword") ?? "");
  if (name && name !== user.name) await db.update(users).set({ name }).where(eq(users.id, user.id));
  if (next) {
    if (next.length < 8) return { error: "New password must be at least 8 characters." };
    if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is wrong." };
    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  }
  revalidatePath("/", "layout");
  return { ok: next ? "Saved. Your password was changed." : "Saved." };
}

export async function signOutEverywhere() {
  const user = await requireUser();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await destroySession();
  redirect("/login");
}

export async function deleteAccount(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(f.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase())
    return { error: "Type your email exactly to confirm." };
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id)); // cascades to all data
  redirect("/?deleted=1");
}

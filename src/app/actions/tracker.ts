"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { answers, applications, jobs } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type FormState = { ok?: string; error?: string } | undefined;
const APP_STATUSES = ["applied", "interviewing", "offer", "rejected", "withdrawn"];

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const date = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function createApplication(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const company = str(f, "company");
  const title = str(f, "title");
  if (!company || !title) return { error: "Company and job title are required." };
  await db.insert(applications).values({
    userId: user.id, company, title, url: str(f, "url"), location: str(f, "location"),
    status: APP_STATUSES.includes(String(f.get("status"))) ? String(f.get("status")) : "applied",
    appliedAt: date(f, "appliedAt") ?? new Date(), followUpAt: date(f, "followUpAt"), notes: str(f, "notes"),
  });
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: "Application added." };
}

export async function updateApplication(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(f.get("id") ?? "");
  const status = String(f.get("status") ?? "");
  if (!APP_STATUSES.includes(status)) return { error: "Invalid status" };
  await db
    .update(applications)
    .set({
      status, followUpAt: date(f, "followUpAt"), contact: str(f, "contact"), salary: str(f, "salary"),
      notes: str(f, "notes"), coverLetter: str(f, "coverLetter"), updatedAt: new Date(),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

export async function setApplicationStatus(id: string, status: string) {
  const user = await requireUser();
  if (!APP_STATUSES.includes(status)) return;
  await db.update(applications).set({ status, updatedAt: new Date() }).where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function deleteApplication(id: string) {
  const user = await requireUser();
  const [app] = await db.delete(applications).where(and(eq(applications.id, id), eq(applications.userId, user.id))).returning();
  if (app?.jobId) await db.update(jobs).set({ status: "saved" }).where(and(eq(jobs.id, app.jobId), eq(jobs.userId, user.id)));
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function saveAnswer(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = str(f, "id");
  const question = str(f, "question");
  const answer = str(f, "answer");
  if (!question || !answer) return { error: "Write both the question and your answer." };
  if (id) {
    await db.update(answers).set({ question, answer, updatedAt: new Date() }).where(and(eq(answers.id, id), eq(answers.userId, user.id)));
  } else {
    await db.insert(answers).values({ userId: user.id, question, answer });
  }
  revalidatePath("/answers");
  return { ok: "Saved." };
}

export async function deleteAnswer(id: string) {
  const user = await requireUser();
  await db.delete(answers).where(and(eq(answers.id, id), eq(answers.userId, user.id)));
  revalidatePath("/answers");
}

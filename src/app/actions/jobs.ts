"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { writeCoverLetter } from "@/lib/cover-letter";

const STATUSES = ["new", "saved", "hidden"] as const;

export async function setJobStatus(jobId: string, status: (typeof STATUSES)[number]) {
  const user = await requireUser();
  if (!STATUSES.includes(status)) return;
  await db.update(jobs).set({ status }).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function generateCoverLetter(jobId: string): Promise<{ text?: string; ai?: boolean; error?: string }> {
  const user = await requireUser();
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  if (!job) return { error: "Job not found" };
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  return writeCoverLetter(job, profile, user);
}

export async function markApplied(jobId: string, coverLetter?: string) {
  const user = await requireUser();
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  if (!job) return { error: "Job not found" };
  const [existing] = await db.select({ id: applications.id }).from(applications).where(and(eq(applications.jobId, job.id), eq(applications.userId, user.id)));
  if (existing) {
    if (coverLetter) await db.update(applications).set({ coverLetter, updatedAt: new Date() }).where(eq(applications.id, existing.id));
  } else {
    const followUp = new Date(Date.now() + 7 * 86_400_000);
    await db.insert(applications).values({
      userId: user.id, jobId: job.id, company: job.company, title: job.title, url: job.applyUrl || job.url,
      location: job.location, salary: job.salary, coverLetter: coverLetter || null, followUpAt: followUp,
    });
  }
  await db.update(jobs).set({ status: "applied" }).where(eq(jobs.id, job.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearHiddenJobs() {
  const user = await requireUser();
  await db.delete(jobs).where(and(eq(jobs.userId, user.id), eq(jobs.status, "hidden")));
  revalidatePath("/jobs");
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { runSearch } from "@/lib/search";

export const maxDuration = 300;

// Daily scheduled search (see vercel.json). Only runs when CRON_SECRET is configured in Vercel.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const due = await db.select({ userId: preferences.userId }).from(preferences).where(eq(preferences.autoSearch, true)).limit(25);
  const results: { userId: string; ok: boolean; found?: number; error?: string }[] = [];
  for (const { userId } of due) {
    try {
      const run = await runSearch(userId, "scheduled");
      results.push({ userId, ok: true, found: run.jobsNew });
    } catch (e) {
      results.push({ userId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ ran: results.length, results });
}

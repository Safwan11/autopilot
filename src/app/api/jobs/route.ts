import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const user = await db.user.findUnique({ where: { email: "demo@autopilot.local" } });
  if (!user) return NextResponse.json({ jobs: [] });
  const jobs = await db.job.findMany({ where: { userId: user.id }, orderBy: { matchScore: "desc" }, take: 200 });
  return NextResponse.json({ jobs });
}

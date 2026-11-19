import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "node:fs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
  const run = await db.agentRun.findUnique({ where: { id: runId } });
  if (!run?.reportPath) return NextResponse.json({ error: "No report" }, { status: 404 });
  const buf = fs.readFileSync(run.reportPath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="autopilot-${runId}.xlsx"`,
    },
  });
}

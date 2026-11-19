import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import { buildExcelReport } from "@/lib/excel-export";

export const maxDuration = 60;

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
  const run = await db.agentRun.findUnique({ where: { id: runId } });
  if (!run) return NextResponse.json({ error: "No report" }, { status: 404 });
  // Reports are generated on demand from the database (no files on disk in production).
  const buf = await buildExcelReport(runId);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="autopilot-${runId}.xlsx"`,
    },
  });
}

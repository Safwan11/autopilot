import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { buildWorkbook } from "@/lib/excel-export";

export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const buf = await buildWorkbook(user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="autopilot-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { runSearch } from "@/lib/search";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const sources = Array.isArray(body?.sources) ? body.sources.filter((x: unknown) => typeof x === "string").slice(0, 20) : undefined;
    const run = await runSearch(user.id, "manual", sources);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 400 });
  }
}

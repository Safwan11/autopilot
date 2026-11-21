import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { runSearch } from "@/lib/search";

export const maxDuration = 120;

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    const run = await runSearch(user.id, "manual");
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 400 });
  }
}

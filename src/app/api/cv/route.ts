import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { extractText, parseCv } from "@/lib/cv-parser";
import { rescoreAll } from "@/lib/search";

export const maxDuration = 60;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 8 MB" }, { status: 400 });
  if (!/\.(pdf|docx|txt)$/i.test(file.name)) return NextResponse.json({ error: "Upload a PDF, DOCX or TXT file" }, { status: 400 });

  let text: string;
  try {
    text = (await extractText(Buffer.from(await file.arrayBuffer()), file.name, file.type)).replace(/\u0000/g, "");
  } catch (e) {
    console.error("CV extract failed", e);
    return NextResponse.json({ error: "Couldn't read that file. Try saving it as a PDF or DOCX again." }, { status: 422 });
  }
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "No readable text found. If it's a scanned PDF, export it as a text PDF or DOCX." }, { status: 422 });
  }

  const p = parseCv(text);
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  // New CV values win, but never wipe something the user already has with an empty value.
  const pick = <T,>(fresh: T | null | undefined, old: T | null | undefined) => (fresh != null && fresh !== "" ? fresh : old ?? null);
  const values = {
    fullName: pick(p.fullName, existing?.fullName) ?? user.name,
    headline: pick(p.headline, existing?.headline),
    email: pick(p.email, existing?.email) ?? user.email,
    phone: pick(p.phone, existing?.phone),
    location: pick(p.location, existing?.location),
    linkedin: pick(p.linkedin, existing?.linkedin),
    yearsExperience: pick(p.yearsExperience, existing?.yearsExperience),
    summary: pick(p.summary, existing?.summary),
    titles: p.titles.length ? p.titles : existing?.titles ?? [],
    skills: [...new Set([...(p.skills ?? []), ...(existing?.skills ?? [])])].slice(0, 80),
    languages: p.languages.length ? p.languages : existing?.languages ?? [],
    cvFileName: file.name,
    cvText: text.slice(0, 60_000),
    cvUploadedAt: new Date(),
    updatedAt: new Date(),
  };
  await db.insert(profiles).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: profiles.userId, set: values });

  // First CV: seed search keywords from the detected titles.
  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, user.id));
  if (!prefs) {
    await db.insert(preferences).values({ userId: user.id, keywords: values.titles.slice(0, 4) });
  }
  await rescoreAll(user.id);

  return NextResponse.json({
    ok: true,
    detected: { skills: values.skills.length, titles: values.titles, years: values.yearsExperience, name: values.fullName },
  });
}

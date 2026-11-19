import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractText, parseCv } from "@/lib/cv-parser";
import fs from "node:fs";
import path from "node:path";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const userId = (form.get("userId") as string) || "demo";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadsDir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buf);

  const mime = file.type || "application/octet-stream";
  const rawText = await extractText(filePath, mime);
  const parsed = parseCv(rawText);

  // ensure user exists
  await db.user.upsert({ where: { email: "demo@autopilot.local" }, update: {}, create: { email: "demo@autopilot.local", name: "Demo User" } });
  const user = await db.user.findUnique({ where: { email: "demo@autopilot.local" } });

  const cv = await db.cv.create({
    data: {
      userId: user!.id,
      fileName: file.name,
      filePath,
      rawText,
      parsed: parsed as any,
      version: 1,
      isActive: true,
    },
  });

  // upsert professional profile from parsed CV
  await db.professionalProfile.upsert({
    where: { userId: user!.id },
    update: {
      titles: JSON.stringify(parsed.titles),
      skills: JSON.stringify(parsed.skills),
      summary: parsed.summary,
    },
    create: {
      userId: user!.id,
      titles: JSON.stringify(parsed.titles),
      skills: JSON.stringify(parsed.skills),
      summary: parsed.summary,
    },
  });

  return NextResponse.json({ cvId: cv.id, parsed });
}

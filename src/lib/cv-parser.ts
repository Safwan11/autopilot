import mammoth from "mammoth";
import { extractSkills } from "./skills";

export interface ParsedCv {
  text: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  location: string | null;
  headline: string | null;
  titles: string[];
  skills: string[];
  languages: string[];
  yearsExperience: number | null;
  summary: string | null;
}

export async function extractText(buf: Buffer, fileName: string, mime: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    // Load the worker entry first: it polyfills DOMMatrix etc. (via @napi-rs/canvas) that pdfjs needs on serverless Node.
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf, CanvasFactory });
    try {
      const data = await parser.getText();
      return (data.text || "").replace(/\n-- \d+ of \d+ --\n/g, "\n");
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || "";
  }
  return buf.toString("utf8");
}

const TITLE_WORDS = [
  "support engineer", "support analyst", "support specialist", "support consultant", "qa engineer", "qa analyst",
  "quality assurance engineer", "quality assurance analyst", "test engineer", "software tester", "test analyst",
  "automation engineer", "sdet", "software engineer", "developer", "consultant", "implementation consultant",
  "implementation engineer", "erp consultant", "business analyst", "system administrator", "systems analyst",
  "devops engineer", "data analyst", "product owner", "project manager", "technical lead", "team lead",
];

const LANGS = ["Arabic", "English", "French", "German", "Spanish", "Urdu", "Hindi", "Turkish", "Italian", "Russian", "Chinese"];

export function parseCv(raw: string): ParsedCv {
  const text = raw.replace(/\u0000/g, "").replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const phone = text.match(/(\+?\d[\d\s\-().]{7,}\d)/)?.[0]?.trim() ?? null;
  const linkedin = text.match(/(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_\-%]+/i)?.[0] ?? null;

  // Name: first short line made of letters only, near the top.
  const fullName =
    lines.slice(0, 6).find((l) => /^[\p{L} .'-]{4,40}$/u.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 5 && !/curriculum|resume|cv\b/i.test(l)) ?? null;

  // Titles: lines or phrases that contain a known job title phrase.
  const titleSet = new Map<string, string>();
  for (const line of lines.slice(0, 80)) {
    const l = line.toLowerCase();
    for (const w of TITLE_WORDS) {
      if (l.includes(w) && line.length <= 70) {
        const clean = line.replace(/[|•·–—-].*$/, "").replace(/\s+at\s+.*/i, "").trim();
        const key = clean.toLowerCase();
        if (clean.length >= 5 && clean.length <= 60 && !titleSet.has(key)) titleSet.set(key, clean);
      }
    }
  }
  const titles = [...titleSet.values()].slice(0, 6);
  const headline = titles[0] ?? null;

  // Years of experience: explicit "X years" or summed date ranges.
  let years: number | null = null;
  const explicit = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:professional\s+|hands[- ]on\s+)?experience/gi)].map((m) => Number(m[1]));
  if (explicit.length) years = Math.max(...explicit);
  else {
    const now = new Date().getFullYear();
    const ranges = [...text.matchAll(/((?:19|20)\d{2})\s*[-–—to]+\s*((?:19|20)\d{2}|present|current|now|date)/gi)];
    if (ranges.length) {
      const starts = ranges.map((r) => Number(r[1]));
      const ends = ranges.map((r) => (/^\d/.test(r[2]) ? Number(r[2]) : now));
      const span = Math.max(...ends) - Math.min(...starts);
      if (span > 0 && span < 45) years = span;
    }
  }

  const languages = LANGS.filter((l) => new RegExp(`\\b${l}\\b`, "i").test(text));

  // Summary: the paragraph after a "summary/profile/objective" heading, else the first long line.
  let summary: string | null = null;
  const idx = lines.findIndex((l) => /^(professional\s+)?(summary|profile|objective|about me)\b/i.test(l));
  if (idx >= 0) summary = lines.slice(idx + 1, idx + 5).join(" ").slice(0, 600);
  else summary = lines.find((l) => l.length > 120)?.slice(0, 600) ?? null;

  const location =
    text.match(/\b(Cairo|Giza|Alexandria|Riyadh|Jeddah|Dammam|Dubai|Abu Dhabi|Sharjah|Doha|Kuwait|Muscat|Manama|Amman|London)\b[^\n]{0,30}/i)?.[0]?.split(/[|•]/)[0].trim() ?? null;

  return {
    text,
    fullName,
    email,
    phone,
    linkedin,
    location,
    headline,
    titles,
    skills: extractSkills(text),
    languages,
    yearsExperience: years,
    summary,
  };
}

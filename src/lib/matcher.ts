import type { Preferences, Profile, ScoreBreakdown } from "@/db/schema";
import { extractSkills, mentionsSkill } from "./skills";
import { tokens } from "./text";
import type { RawJob } from "./sources";

export interface MatchResult {
  score: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  excluded: boolean;
}

export const WEIGHTS = { skills: 0.45, title: 0.3, location: 0.15, seniority: 0.1 };

export function scoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}

function requiredYears(text: string): number | null {
  const m = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years|yrs)/gi)]
    .map((x) => Number(x[1]))
    .filter((n) => n > 0 && n < 20);
  return m.length ? Math.min(...m) : null;
}

const SENIOR = /\b(senior|sr\.?|lead|principal|staff|head|manager|director)\b/i;
const JUNIOR = /\b(junior|jr\.?|intern|internship|graduate|entry[- ]level|trainee)\b/i;

export function scoreJob(job: RawJob, profile: Partial<Profile>, prefs: Partial<Preferences>): MatchResult {
  const text = `${job.title}\n${job.tags.join(", ")}\n${job.description}`;
  const lowerText = text.toLowerCase();

  // Exclusions
  const excluded =
    (prefs.excludeKeywords ?? []).some((k) => k && lowerText.includes(k.toLowerCase())) ||
    (prefs.excludeCompanies ?? []).some((c) => c && job.company.toLowerCase().includes(c.toLowerCase()));

  // 1) Skills: how many of the job's recognised skills the candidate has, plus candidate skills mentioned.
  const mySkills = profile.skills ?? [];
  const jobSkills = extractSkills(text);
  const matched = mySkills.filter((s) => mentionsSkill(text, s));
  const missing = jobSkills.filter((s) => !mySkills.some((m) => m.toLowerCase() === s.toLowerCase())).slice(0, 8);
  let skills: number;
  if (!mySkills.length) skills = 0.3;
  else if (jobSkills.length) {
    const coverage = jobSkills.filter((s) => mySkills.some((m) => m.toLowerCase() === s.toLowerCase())).length / jobSkills.length;
    skills = Math.min(1, 0.65 * coverage + 0.35 * Math.min(1, matched.length / 5));
  } else skills = Math.min(1, matched.length / 4);

  // 2) Title: best token overlap between the job title and the candidate's titles / target keywords.
  const targets = [...(prefs.keywords ?? []), ...(profile.titles ?? []), profile.headline ?? ""].filter(Boolean);
  const jt = new Set(tokens(job.title));
  let title = targets.length ? 0 : 0.4;
  for (const t of targets) {
    const tt = tokens(t);
    if (!tt.length) continue;
    const hit = tt.filter((x) => jt.has(x)).length / tt.length;
    title = Math.max(title, hit);
  }

  // 3) Location / work mode fit.
  const wantRemote = prefs.remote ?? true;
  const wantOnsite = (prefs.onsite ?? true) || (prefs.hybrid ?? true);
  const locs = (prefs.locations ?? []).map((l) => l.toLowerCase());
  const jobLoc = `${job.location ?? ""}`.toLowerCase();
  const worldwide = /worldwide|anywhere|global|remote$|^remote|emea|mena|middle east/.test(jobLoc) || !jobLoc;
  let location = 0.5;
  if (job.remoteType === "Remote") {
    if (!wantRemote) location = 0.2;
    else if (worldwide || !locs.length) location = 1;
    else location = locs.some((l) => jobLoc.includes(l)) ? 1 : 0.35; // remote but restricted to other regions
  } else {
    if (!wantOnsite) location = 0.1;
    else location = !locs.length ? 0.6 : locs.some((l) => jobLoc.includes(l)) ? 1 : 0.15;
  }

  // 4) Seniority vs years of experience.
  const years = profile.yearsExperience ?? null;
  const need = requiredYears(job.description);
  let seniority = 0.7;
  if (years != null) {
    if (need != null) seniority = years >= need ? 1 : Math.max(0, 1 - (need - years) * 0.25);
    else if (SENIOR.test(job.title)) seniority = years >= 5 ? 1 : years >= 3 ? 0.6 : 0.3;
    else if (JUNIOR.test(job.title)) seniority = years <= 3 ? 1 : 0.5;
    else seniority = 0.85;
  }

  const breakdown = {
    skills: Math.round(skills * 100),
    title: Math.round(title * 100),
    location: Math.round(location * 100),
    seniority: Math.round(seniority * 100),
  };
  let score = Math.round(
    breakdown.skills * WEIGHTS.skills + breakdown.title * WEIGHTS.title +
    breakdown.location * WEIGHTS.location + breakdown.seniority * WEIGHTS.seniority,
  );
  if (excluded) score = 0;

  const parts: string[] = [];
  if (matched.length) parts.push(`You have ${matched.length} of the skills it mentions (${matched.slice(0, 4).join(", ")}${matched.length > 4 ? "…" : ""}).`);
  else parts.push("Few of your listed skills appear in this posting.");
  if (missing.length) parts.push(`Gaps: ${missing.slice(0, 4).join(", ")}.`);
  if (need != null && years != null) parts.push(`Asks for ${need}+ years; you have ${years}.`);
  if (location < 0.4) parts.push("Location or work mode doesn't fit your preferences.");
  if (excluded) parts.push("Hidden because it matches one of your exclusions.");

  return { score, breakdown, matchedSkills: matched.slice(0, 12), missingSkills: missing, reasoning: parts.join(" "), excluded };
}

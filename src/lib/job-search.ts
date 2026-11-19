import { db } from "./db";

export interface RawJob {
  externalId: string | null;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  remoteType: string | null;
  employmentType: string | null;
  salary: string | null;
  currency: string | null;
  datePosted: string | null;
  source: string;
  sourceUrl: string;
  applicationUrl: string | null;
  description: string;
}

// --- Remotive (remote jobs, free API) ---
export async function searchRemotive(query: string): Promise<RawJob[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=25`;
    const res = await fetch(url, { headers: { "User-Agent": "Autopilot/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((j: any) => ({
      externalId: String(j.id),
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || "Remote",
      country: null,
      city: null,
      remoteType: "Remote",
      employmentType: j.job_type || null,
      salary: j.salary || null,
      currency: null,
      datePosted: j.publication_date || null,
      source: "Remotive",
      sourceUrl: j.url,
      applicationUrl: j.url,
      description: j.description || "",
    }));
  } catch (e) {
    console.error("Remotive search failed", e);
    return [];
  }
}

// --- Arbeitnow (remote/EU jobs, free API) ---
export async function searchArbeitnow(query: string): Promise<RawJob[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Autopilot/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((j: any) => ({
      externalId: j.slug,
      title: j.title,
      company: j.company_name,
      location: j.location,
      country: null,
      city: j.location,
      remoteType: j.remote ? "Remote" : "Onsite",
      employmentType: j.job_type || null,
      salary: null,
      currency: null,
      datePosted: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      source: "Arbeitnow",
      sourceUrl: j.url,
      applicationUrl: j.url,
      description: j.description || "",
    }));
  } catch (e) {
    console.error("Arbeitnow search failed", e);
    return [];
  }
}

// --- Himalayas (remote jobs, free API) ---
export async function searchHimalayas(query: string): Promise<RawJob[]> {
  try {
    const url = `https://himalayas.app/jobs/api?limit=20&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Autopilot/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((j: any) => ({
      externalId: j.guid,
      title: j.title,
      company: j.companyName,
      location: (j.locationRestrictions || []).join(", ") || "Remote",
      country: null,
      city: null,
      remoteType: "Remote",
      employmentType: j.employmentType || null,
      salary: j.minSalary ? `${j.minSalary}-${j.maxSalary} ${j.currency}` : null,
      currency: j.currency || null,
      datePosted: j.pubDate || null,
      source: "Himalayas",
      sourceUrl: j.applicationLink || j.url,
      applicationUrl: j.applicationLink || j.url,
      description: j.description || "",
    }));
  } catch (e) {
    console.error("Himalayas search failed", e);
    return [];
  }
}

export async function discoverJobs(queries: string[]): Promise<RawJob[]> {
  const results: RawJob[] = [];
  for (const q of queries) {
    const [r, a, h] = await Promise.all([
      searchRemotive(q),
      searchArbeitnow(q),
      searchHimalayas(q),
    ]);
    results.push(...r, ...a, ...h);
  }
  // dedup by sourceUrl
  const seen = new Set<string>();
  const unique: RawJob[] = [];
  for (const j of results) {
    if (seen.has(j.sourceUrl)) continue;
    seen.add(j.sourceUrl);
    unique.push(j);
  }
  return unique;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

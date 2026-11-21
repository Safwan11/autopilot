/* eslint-disable @typescript-eslint/no-explicit-any -- untyped JSON from third-party APIs */
import { htmlToText } from "./text";

export interface RawJob {
  source: string;
  externalId: string | null;
  url: string;
  applyUrl: string | null;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  remoteType: "Remote" | "Hybrid" | "Onsite" | null;
  employmentType: string | null;
  salary: string | null;
  tags: string[];
  description: string;
  postedAt: Date | null;
}

export interface SourceDef {
  id: string;
  name: string;
  description: string;
  search: (query: string) => Promise<RawJob[]>;
}

const UA = { "User-Agent": "Mozilla/5.0 (compatible; AutopilotJobAgent/2.0)", Accept: "application/json" };

async function getJson(url: string, timeoutMs = 12_000): Promise<any> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const toDate = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

const fmtSalary = (min?: number | null, max?: number | null, cur?: string | null) => {
  if (!min && !max) return null;
  const f = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  return [min ? f(min) : null, max ? f(max) : null].filter(Boolean).join("–") + (cur ? ` ${cur}` : "");
};

/** True when every word of the query appears in the job's title/tags/description. */
export function matchesQuery(job: Pick<RawJob, "title" | "tags" | "description">, query: string): boolean {
  const hay = `${job.title} ${job.tags.join(" ")} ${job.description.slice(0, 3000)}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter((w) => w.length > 1).every((w) => hay.includes(w));
}

export const SOURCES: SourceDef[] = [
  {
    id: "remotive",
    name: "Remotive",
    description: "Curated remote jobs (tech, support, QA)",
    async search(q) {
      const data = await getJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=50`);
      return (data.jobs ?? []).map((j: any): RawJob => ({
        source: "Remotive",
        externalId: String(j.id),
        url: j.url,
        applyUrl: j.url,
        title: j.title,
        company: j.company_name,
        companyLogo: j.company_logo || null,
        location: j.candidate_required_location || "Worldwide",
        remoteType: "Remote",
        employmentType: j.job_type ? String(j.job_type).replace(/_/g, " ") : null,
        salary: j.salary || null,
        tags: j.tags ?? [],
        description: htmlToText(j.description ?? ""),
        postedAt: toDate(j.publication_date),
      }));
    },
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    description: "Europe-focused jobs, many remote and visa-friendly",
    async search(q) {
      const data = await getJson(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`);
      return (data.data ?? []).map((j: any): RawJob => ({
        source: "Arbeitnow",
        externalId: j.slug,
        url: j.url,
        applyUrl: j.url,
        title: j.title,
        company: j.company_name,
        companyLogo: null,
        location: j.location || null,
        remoteType: j.remote ? "Remote" : "Onsite",
        employmentType: (j.job_types ?? [])[0] ?? null,
        salary: null,
        tags: j.tags ?? [],
        description: htmlToText(j.description ?? ""),
        postedAt: toDate(j.created_at),
      }));
    },
  },
  {
    id: "himalayas",
    name: "Himalayas",
    description: "Remote jobs with salary data",
    async search(q) {
      const data = await getJson(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&limit=40`).catch(() =>
        getJson(`https://himalayas.app/jobs/api?limit=40&q=${encodeURIComponent(q)}`),
      );
      return (data.jobs ?? []).map((j: any): RawJob => ({
        source: "Himalayas",
        externalId: j.guid ?? null,
        url: j.applicationLink || j.guid,
        applyUrl: j.applicationLink || null,
        title: j.title,
        company: j.companyName,
        companyLogo: j.companyLogo || null,
        location: (j.locationRestrictions ?? []).join(", ") || "Worldwide",
        remoteType: "Remote",
        employmentType: j.employmentType || null,
        salary: fmtSalary(j.minSalary, j.maxSalary, j.currency),
        tags: [...(j.categories ?? []), ...(j.skills ?? [])].map((t: string) => String(t).replace(/-/g, " ")).slice(0, 15),
        description: htmlToText(j.description ?? j.excerpt ?? ""),
        postedAt: toDate(j.pubDate),
      }));
    },
  },
  {
    id: "jobicy",
    name: "Jobicy",
    description: "Remote jobs worldwide, including MENA",
    async search(q) {
      const data = await getJson(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(q)}`);
      return (data.jobs ?? []).map((j: any): RawJob => ({
        source: "Jobicy",
        externalId: String(j.id),
        url: j.url,
        applyUrl: j.url,
        title: htmlToText(j.jobTitle ?? ""),
        company: j.companyName,
        companyLogo: j.companyLogo || null,
        location: j.jobGeo || "Worldwide",
        remoteType: "Remote",
        employmentType: Array.isArray(j.jobType) ? j.jobType[0] : j.jobType ?? null,
        salary: fmtSalary(j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency),
        tags: [...(j.jobIndustry ?? []), j.jobLevel].filter(Boolean),
        description: htmlToText(j.jobDescription ?? j.jobExcerpt ?? ""),
        postedAt: toDate(j.pubDate),
      }));
    },
  },
  {
    id: "remoteok",
    name: "Remote OK",
    description: "Large remote job board (latest postings)",
    async search(q) {
      const tag = q.toLowerCase().trim().replace(/\s+/g, "-");
      const data = await getJson(`https://remoteok.com/api?tag=${encodeURIComponent(tag)}`);
      return (Array.isArray(data) ? data : [])
        .filter((j: any) => j && j.position)
        .map((j: any): RawJob => ({
          source: "Remote OK",
          externalId: String(j.id),
          url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
          applyUrl: j.apply_url || j.url || null,
          title: j.position,
          company: j.company,
          companyLogo: j.company_logo || j.logo || null,
          location: j.location || "Worldwide",
          remoteType: "Remote",
          employmentType: null,
          salary: fmtSalary(j.salary_min, j.salary_max, "USD"),
          tags: j.tags ?? [],
          description: htmlToText(j.description ?? ""),
          postedAt: toDate(j.date ?? j.epoch),
        }));
    },
  },
];

export const DEFAULT_SOURCE_IDS = SOURCES.map((s) => s.id);

/** Deep links to big job boards that have no public API (searched by the user in their browser). */
export function boardLinks(keyword: string, location: string) {
  const k = encodeURIComponent(keyword);
  const l = encodeURIComponent(location);
  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${k}&location=${l}&f_TPR=r604800` },
    { name: "Indeed", url: `https://www.indeed.com/jobs?q=${k}&l=${l}&fromage=14` },
    { name: "Bayt", url: `https://www.bayt.com/en/international/jobs/${slug(keyword)}-jobs-in-${slug(location || "middle-east")}/` },
    { name: "GulfTalent", url: `https://www.gulftalent.com/jobs/search?keyword=${k}` },
    { name: "Naukrigulf", url: `https://www.naukrigulf.com/${slug(keyword)}-jobs${location ? `-in-${slug(location)}` : ""}` },
    { name: "Google Jobs", url: `https://www.google.com/search?q=${encodeURIComponent(`${keyword} jobs ${location}`)}&ibp=htl;jobs` },
  ];
}

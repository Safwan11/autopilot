/* eslint-disable @typescript-eslint/no-explicit-any -- untyped JSON from third-party APIs */
import { parse, type HTMLElement } from "node-html-parser";
import { htmlToText } from "./text";
import { type Country, slug } from "./countries";

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

export type Region = "Global" | "Gulf & MENA" | "Egypt";

/** Searched by JobPilot on the server; results land in your Jobs list. */
export interface AutoSource {
  kind: "auto";
  id: string;
  name: string;
  region: Region;
  description: string;
  /** Runs once per country in your preferences (otherwise once, worldwide). */
  locationAware: boolean;
  /** Listing pages only show a title, so relevance is judged on the title. */
  titleOnly?: boolean;
  /** Only run for these countries (e.g. Wuzzuf → Egypt). */
  countries?: string[];
  search: (query: string, country: Country | null) => Promise<RawJob[]>;
  /** Fetch the full description for the best results (costs one request per job). */
  enrich?: (job: RawJob) => Promise<Partial<RawJob> | null>;
}

/** Sites that block automated search: JobPilot builds the search link for you. */
export interface LinkSource {
  kind: "link";
  id: string;
  name: string;
  region: Region;
  description: string;
  url: (keyword: string, country: Country | null) => string;
}

export type Source = AutoSource | LinkSource;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 JobPilot/3.0";

async function get(url: string, accept: "json" | "html", timeoutMs = 12_000): Promise<any> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: accept === "json" ? "application/json" : "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return accept === "json" ? res.json() : res.text();
}

const toDate = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

/** "27 Oct" → Date (this year, or last year if that would be in the future). */
function dayMonth(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const now = new Date();
  let d = new Date(`${m[1]} ${m[2]} ${now.getFullYear()} 12:00 UTC`);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 86_400_000) d = new Date(`${m[1]} ${m[2]} ${now.getFullYear() - 1} 12:00 UTC`);
  return d;
}

/** "3 days ago" / "2 weeks ago" → Date */
function relative(s: string): Date | null {
  const m = s.toLowerCase().match(/(\d+)\s*(minute|hour|day|week|month)/);
  if (!m) return /today|just now|hour/.test(s.toLowerCase()) ? new Date() : null;
  const n = Number(m[1]);
  const unit = { minute: 60e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3 }[m[2] as "day"];
  return new Date(Date.now() - n * unit);
}

const fmtSalary = (min?: number | null, max?: number | null, cur?: string | null) => {
  if (!min && !max) return null;
  const f = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  return [min ? f(min) : null, max ? f(max) : null].filter(Boolean).join("–") + (cur ? ` ${cur}` : "");
};

const txt = (el: HTMLElement | null | undefined) => (el ? htmlToText(el.innerHTML).replace(/\s+/g, " ").replace(/\s+,/g, ",").trim() : "");
const remoteFrom = (s: string | null | undefined): RawJob["remoteType"] =>
  !s ? null : /remote/i.test(s) ? "Remote" : /hybrid/i.test(s) ? "Hybrid" : null;

const words = (q: string) => q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

/** Full-text relevance: every word of the query appears in the job. */
export function matchesQuery(job: Pick<RawJob, "title" | "tags" | "description">, query: string): boolean {
  const hay = `${job.title} ${job.tags.join(" ")} ${job.description.slice(0, 3000)}`.toLowerCase();
  return words(query).every((w) => hay.includes(w));
}

/** Title relevance for listing pages without descriptions: most query words are in the title. */
export function titleMatches(title: string, query: string): boolean {
  const w = words(query);
  if (!w.length) return true;
  const t = title.toLowerCase();
  const hits = w.filter((x) => t.includes(x)).length;
  return hits >= Math.max(1, Math.ceil(w.length * 0.6));
}

// ───────────────────────────── Automatic sources ─────────────────────────────

const linkedin: AutoSource = {
  kind: "auto",
  id: "linkedin",
  name: "LinkedIn",
  region: "Global",
  description: "Public LinkedIn job listings in your countries (last 30 days)",
  locationAware: true,
  titleOnly: true,
  async search(q, country) {
    const loc = country?.name ?? "Worldwide";
    const html = await get(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}&f_TPR=r2592000&start=0`,
      "html",
    );
    const root = parse(html);
    return root.querySelectorAll("li").flatMap((li): RawJob[] => {
      const card = li.querySelector(".base-search-card");
      const id = card?.getAttribute("data-entity-urn")?.split(":").pop() ?? null;
      const href = li.querySelector("a.base-card__full-link")?.getAttribute("href")?.split("?")[0];
      const title = txt(li.querySelector(".base-search-card__title"));
      if (!href || !title) return [];
      const location = txt(li.querySelector(".job-search-card__location")) || null;
      return [{
        source: "LinkedIn", externalId: id, url: href, applyUrl: href, title,
        company: txt(li.querySelector(".base-search-card__subtitle")) || "Unknown company",
        companyLogo: li.querySelector("img")?.getAttribute("data-delayed-url") ?? null,
        location, remoteType: remoteFrom(location), employmentType: null, salary: txt(li.querySelector(".job-search-card__salary-info")) || null,
        tags: [], description: "", postedAt: toDate(li.querySelector("time")?.getAttribute("datetime")),
      }];
    });
  },
  async enrich(job) {
    if (!job.externalId) return null;
    const root = parse(await get(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${job.externalId}`, "html", 8000));
    const description = htmlToText(root.querySelector(".show-more-less-html__markup")?.innerHTML ?? "");
    const criteria = Object.fromEntries(
      root.querySelectorAll(".description__job-criteria-item").map((c) => [txt(c.querySelector("h3")), txt(c.querySelector("span"))]),
    );
    return {
      description,
      employmentType: criteria["Employment type"] || job.employmentType,
      tags: [criteria["Seniority level"], criteria["Job function"], criteria["Industries"]].filter(Boolean) as string[],
    };
  },
};

const bayt: AutoSource = {
  kind: "auto",
  id: "bayt",
  name: "Bayt",
  region: "Gulf & MENA",
  description: "The largest Gulf & Middle East job site",
  locationAware: true,
  titleOnly: true,
  async search(q, country) {
    const where = country?.bayt ?? "international";
    const html = await get(`https://www.bayt.com/en/${where}/jobs/${slug(q)}-jobs/`, "html");
    const root = parse(html);
    return root.querySelectorAll("li[data-js-job]").flatMap((li): RawJob[] => {
      const a = li.querySelector("h2 a");
      const href = a?.getAttribute("href");
      const title = (a?.getAttribute("title") || txt(a)).trim();
      if (!href || !title) return [];
      const url = new URL(href, "https://www.bayt.com").toString();
      const company = txt(li.querySelector(".job-company-location-wrapper div")) || txt(li.querySelector(".job-company-location-wrapper")) || "Confidential";
      const location = txt(li.querySelector(".jb-label-location")) || country?.name || null;
      const summary = txt(li.querySelector(".jb-descr")).replace(/^Summary:\s*/i, "");
      const ts = li.querySelector("[data-automation-jobactivedate]")?.getAttribute("data-automation-jobactivedate");
      return [{
        source: "Bayt", externalId: li.getAttribute("data-job-id") ?? null, url, applyUrl: url, title, company,
        companyLogo: null, location, remoteType: remoteFrom(`${title} ${location}`), employmentType: null, salary: null,
        tags: [], description: summary, postedAt: ts ? toDate(Number(ts)) : relative(txt(li.querySelector(".jb-date"))),
      }];
    });
  },
};

const gulftalent: AutoSource = {
  kind: "auto",
  id: "gulftalent",
  name: "GulfTalent",
  region: "Gulf & MENA",
  description: "Professional jobs across the GCC",
  locationAware: true,
  titleOnly: true,
  countries: ["sa", "ae", "qa", "kw", "om", "bh"],
  async search(q, country) {
    const html = await get(`https://www.gulftalent.com/${country?.gulftalent ? country.gulftalent + "/" : ""}jobs/title/${slug(q)}`, "html");
    const root = parse(html);
    return root.querySelectorAll("tr").flatMap((tr): RawJob[] => {
      const a = tr.querySelector("a.ga-job-click") ?? tr.querySelector("a.title");
      const href = a?.getAttribute("href");
      const title = txt(a);
      if (!href || !title) return [];
      const tds = tr.querySelectorAll("td");
      const url = new URL(href, "https://www.gulftalent.com").toString();
      const company = txt(tr.querySelector("td a.text-muted")) || "Unknown company";
      const location = txt(tds[1]) || country?.name || null;
      return [{
        source: "GulfTalent", externalId: href.match(/(\d+)$/)?.[1] ?? null, url, applyUrl: url, title, company,
        companyLogo: tr.querySelector("img")?.getAttribute("src") ?? null, location, remoteType: null, employmentType: null,
        salary: null, tags: [], description: "", postedAt: dayMonth(txt(tds[2])),
      }];
    });
  },
};

const wuzzuf: AutoSource = {
  kind: "auto",
  id: "wuzzuf",
  name: "Wuzzuf",
  region: "Egypt",
  description: "Egypt's biggest job site",
  locationAware: false,
  titleOnly: true,
  countries: ["eg"],
  async search(q) {
    const html = await get(`https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(q)}&a=hpb`, "html");
    const root = parse(html);
    const anchors = root.querySelectorAll('h2 a[href*="/jobs/p/"]');
    return anchors.flatMap((a): RawJob[] => {
      const href = a.getAttribute("href");
      const title = txt(a);
      if (!href || !title) return [];
      const box = a.parentNode?.parentNode as HTMLElement | undefined;
      const meta = box?.querySelectorAll("div")?.[0];
      const company = txt(meta?.querySelector("a")).replace(/\s*-\s*$/, "") || "Confidential";
      const location = txt(meta?.querySelector("span")) || "Egypt";
      const when = txt(meta?.querySelectorAll("div")?.[0]);
      const url = new URL(href, "https://wuzzuf.net").toString();
      return [{
        source: "Wuzzuf", externalId: href.split("/").pop() ?? null, url, applyUrl: url, title, company, companyLogo: null,
        location, remoteType: remoteFrom(`${title} ${location}`), employmentType: null, salary: null,
        tags: (box?.parentNode as HTMLElement | undefined)?.querySelectorAll("a[href*='/a/']")?.map((t) => txt(t)).filter(Boolean).slice(0, 10) ?? [],
        description: "", postedAt: relative(when),
      }];
    });
  },
};

const remotive: AutoSource = {
  kind: "auto", id: "remotive", name: "Remotive", region: "Global", description: "Curated remote jobs (tech, support, QA)", locationAware: false,
  async search(q) {
    const data = await get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=50`, "json");
    return (data.jobs ?? []).map((j: any): RawJob => ({
      source: "Remotive", externalId: String(j.id), url: j.url, applyUrl: j.url, title: j.title, company: j.company_name,
      companyLogo: j.company_logo || null, location: j.candidate_required_location || "Worldwide", remoteType: "Remote",
      employmentType: j.job_type ? String(j.job_type).replace(/_/g, " ") : null, salary: j.salary || null, tags: j.tags ?? [],
      description: htmlToText(j.description ?? ""), postedAt: toDate(j.publication_date),
    }));
  },
};

const arbeitnow: AutoSource = {
  kind: "auto", id: "arbeitnow", name: "Arbeitnow", region: "Global", description: "Europe-focused, many remote & visa-sponsored roles", locationAware: false,
  async search(q) {
    const data = await get(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`, "json");
    return (data.data ?? []).map((j: any): RawJob => ({
      source: "Arbeitnow", externalId: j.slug, url: j.url, applyUrl: j.url, title: j.title, company: j.company_name, companyLogo: null,
      location: j.location || null, remoteType: j.remote ? "Remote" : "Onsite", employmentType: (j.job_types ?? [])[0] ?? null, salary: null,
      tags: j.tags ?? [], description: htmlToText(j.description ?? ""), postedAt: toDate(j.created_at),
    }));
  },
};

const himalayas: AutoSource = {
  kind: "auto", id: "himalayas", name: "Himalayas", region: "Global", description: "Remote jobs with salary data", locationAware: false,
  async search(q) {
    const data = await get(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&limit=40`, "json");
    return (data.jobs ?? []).map((j: any): RawJob => ({
      source: "Himalayas", externalId: j.guid ?? null, url: j.applicationLink || j.guid, applyUrl: j.applicationLink || null, title: j.title,
      company: j.companyName, companyLogo: j.companyLogo || null, location: (j.locationRestrictions ?? []).join(", ") || "Worldwide",
      remoteType: "Remote", employmentType: j.employmentType || null, salary: fmtSalary(j.minSalary, j.maxSalary, j.currency),
      tags: [...(j.categories ?? []), ...(j.skills ?? [])].map((t: string) => String(t).replace(/-/g, " ")).slice(0, 15),
      description: htmlToText(j.description ?? j.excerpt ?? ""), postedAt: toDate(j.pubDate),
    }));
  },
};

const jobicy: AutoSource = {
  kind: "auto", id: "jobicy", name: "Jobicy", region: "Global", description: "Remote jobs worldwide, including MENA", locationAware: false,
  async search(q) {
    const data = await get(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(q)}`, "json");
    return (data.jobs ?? []).map((j: any): RawJob => ({
      source: "Jobicy", externalId: String(j.id), url: j.url, applyUrl: j.url, title: htmlToText(j.jobTitle ?? ""), company: j.companyName,
      companyLogo: j.companyLogo || null, location: j.jobGeo || "Worldwide", remoteType: "Remote",
      employmentType: Array.isArray(j.jobType) ? j.jobType[0] : j.jobType ?? null, salary: fmtSalary(j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency),
      tags: [...(j.jobIndustry ?? []), j.jobLevel].filter(Boolean), description: htmlToText(j.jobDescription ?? j.jobExcerpt ?? ""), postedAt: toDate(j.pubDate),
    }));
  },
};

const remoteok: AutoSource = {
  kind: "auto", id: "remoteok", name: "Remote OK", region: "Global", description: "Large remote job board (latest postings)", locationAware: false,
  async search(q) {
    const data = await get(`https://remoteok.com/api?tag=${encodeURIComponent(slug(q))}`, "json");
    return (Array.isArray(data) ? data : []).filter((j: any) => j && j.position).map((j: any): RawJob => ({
      source: "Remote OK", externalId: String(j.id), url: j.url || `https://remoteok.com/remote-jobs/${j.id}`, applyUrl: j.apply_url || j.url || null,
      title: j.position, company: j.company, companyLogo: j.company_logo || j.logo || null, location: j.location || "Worldwide", remoteType: "Remote",
      employmentType: null, salary: fmtSalary(j.salary_min, j.salary_max, "USD"), tags: j.tags ?? [], description: htmlToText(j.description ?? ""),
      postedAt: toDate(j.date ?? j.epoch),
    }));
  },
};

// ───────────────────────────── Link-only sources ─────────────────────────────

const enc = encodeURIComponent;
const LINKS: LinkSource[] = [
  { kind: "link", id: "linkedin-link", name: "LinkedIn", region: "Global", description: "Full LinkedIn search (more filters, Easy Apply)",
    url: (k, c) => `https://www.linkedin.com/jobs/search/?keywords=${enc(k)}&location=${enc(c?.name ?? "")}&f_TPR=r604800` },
  { kind: "link", id: "bayt-link", name: "Bayt", region: "Gulf & MENA", description: "All Bayt results with filters",
    url: (k, c) => `https://www.bayt.com/en/${c?.bayt ?? "international"}/jobs/${slug(k)}-jobs/` },
  { kind: "link", id: "wuzzuf-link", name: "Wuzzuf", region: "Egypt", description: "Egypt's biggest job site",
    url: (k) => `https://wuzzuf.net/search/jobs/?q=${enc(k)}&a=hpb` },
  { kind: "link", id: "glassdoor", name: "Glassdoor", region: "Global", description: "Jobs plus company reviews & salaries (set the location on the site)",
    url: (k) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${enc(k)}` },
  { kind: "link", id: "gulftalent-link", name: "GulfTalent", region: "Gulf & MENA", description: "Professional GCC jobs",
    url: (k, c) => `https://www.gulftalent.com/${c?.gulftalent ? c.gulftalent + "/" : ""}jobs/title/${slug(k)}` },
  { kind: "link", id: "naukrigulf", name: "Naukrigulf", region: "Gulf & MENA", description: "Large Gulf job board",
    url: (k, c) => `https://www.naukrigulf.com/${slug(k)}-jobs${c?.naukri ? `-in-${c.naukri}` : ""}` },
  { kind: "link", id: "foundit", name: "foundit Gulf", region: "Gulf & MENA", description: "Formerly Monster Gulf",
    url: (k, c) => `https://www.founditgulf.com/srp/results?query=${enc(k)}${c ? `&locations=${enc(c.name)}` : ""}` },
  { kind: "link", id: "indeed", name: "Indeed", region: "Global", description: "Country Indeed site for your location",
    url: (k, c) => `https://${c?.indeed ?? "www.indeed.com"}/jobs?q=${enc(k)}&fromage=14` },
  { kind: "link", id: "google", name: "Google Jobs", region: "Global", description: "Aggregates postings from many sites",
    url: (k, c) => `https://www.google.com/search?q=${enc(`${k} jobs ${c?.name ?? ""}`.trim())}&ibp=htl;jobs` },
];

export const AUTO_SOURCES: AutoSource[] = [linkedin, bayt, gulftalent, wuzzuf, remotive, arbeitnow, himalayas, jobicy, remoteok];
export const LINK_SOURCES: LinkSource[] = LINKS;
export const ALL_SOURCES: Source[] = [...AUTO_SOURCES, ...LINK_SOURCES];
export const sourceById = (id: string) => ALL_SOURCES.find((s) => s.id === id);

/** Sources the user has turned on. An empty list means "everything". */
export function enabledAuto(ids: string[] | null | undefined) {
  const set = ids?.filter((id) => AUTO_SOURCES.some((s) => s.id === id));
  return set?.length ? AUTO_SOURCES.filter((s) => set.includes(s.id)) : AUTO_SOURCES;
}
/** null/undefined means "all"; an empty list means the user turned them all off. */
export function enabledLinks(ids: string[] | null | undefined) {
  return ids == null ? LINK_SOURCES : LINK_SOURCES.filter((s) => ids.includes(s.id));
}

export interface Country {
  code: string;
  name: string;
  aliases: string[];
  bayt?: string; // bayt.com path segment
  gulftalent?: string; // gulftalent.com path segment
  indeed: string; // indeed host
  naukri?: string; // naukrigulf slug
}

export const COUNTRIES: Country[] = [
  { code: "eg", name: "Egypt", aliases: ["egypt", "cairo", "giza", "alexandria", "6th of october", "new cairo", "masr"], bayt: "egypt", indeed: "eg.indeed.com", naukri: "egypt" },
  { code: "sa", name: "Saudi Arabia", aliases: ["saudi", "ksa", "riyadh", "jeddah", "dammam", "khobar", "makkah", "mecca", "medina", "madinah"], bayt: "saudi-arabia", gulftalent: "saudi-arabia", indeed: "sa.indeed.com", naukri: "saudi-arabia" },
  { code: "ae", name: "United Arab Emirates", aliases: ["uae", "emirates", "dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah"], bayt: "uae", gulftalent: "uae", indeed: "ae.indeed.com", naukri: "uae" },
  { code: "qa", name: "Qatar", aliases: ["qatar", "doha"], bayt: "qatar", gulftalent: "qatar", indeed: "qa.indeed.com", naukri: "qatar" },
  { code: "kw", name: "Kuwait", aliases: ["kuwait"], bayt: "kuwait", gulftalent: "kuwait", indeed: "kw.indeed.com", naukri: "kuwait" },
  { code: "om", name: "Oman", aliases: ["oman", "muscat"], bayt: "oman", gulftalent: "oman", indeed: "om.indeed.com", naukri: "oman" },
  { code: "bh", name: "Bahrain", aliases: ["bahrain", "manama"], bayt: "bahrain", gulftalent: "bahrain", indeed: "bh.indeed.com", naukri: "bahrain" },
  { code: "jo", name: "Jordan", aliases: ["jordan", "amman"], bayt: "jordan", indeed: "jo.indeed.com", naukri: "jordan" },
];

/** Countries mentioned in the user's location preferences, in their order. */
export function resolveCountries(locations: string[] | null | undefined): Country[] {
  const out: Country[] = [];
  for (const raw of locations ?? []) {
    const l = raw.toLowerCase().trim();
    const c = COUNTRIES.find((c) => c.code === l || c.name.toLowerCase() === l || c.aliases.some((a) => l.includes(a)));
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

export const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

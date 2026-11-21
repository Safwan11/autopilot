import { NextResponse } from "next/server";
import { AUTO_SOURCES } from "@/lib/sources";
import { COUNTRIES } from "@/lib/countries";

// Public health check of each automatic source. Cached for 6 hours so it never hammers the sites.
export const revalidate = 21600;
export const dynamic = "force-static";
export const maxDuration = 60;

export async function GET() {
  const sa = COUNTRIES.find((c) => c.code === "sa")!;
  const eg = COUNTRIES.find((c) => c.code === "eg")!;
  const results = await Promise.all(
    AUTO_SOURCES.map(async (s) => {
      const started = Date.now();
      try {
        const country = s.locationAware ? (s.countries && !s.countries.includes("sa") ? eg : sa) : null;
        const jobs = await s.search("support", country);
        return { source: s.name, ok: jobs.length > 0, results: jobs.length, ms: Date.now() - started, sample: jobs[0] ? `${jobs[0].title} — ${jobs[0].company}` : null };
      } catch (e) {
        return { source: s.name, ok: false, results: 0, ms: Date.now() - started, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}

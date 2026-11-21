import { desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { AUTO_SOURCES } from "@/lib/sources";
import { ago, requestTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card } from "./ui";

/** Status of each automatic source, from the latest searches by anyone (counts only). */
export async function SourceHealth() {
  const recent = await db
    .select({ stats: runs.sourceStats, at: runs.startedAt })
    .from(runs)
    .where(gt(runs.startedAt, new Date(requestTime() - 3 * 86_400_000)))
    .orderBy(desc(runs.startedAt))
    .limit(40);
  const latest = new Map<string, { ok: boolean; found: number; at: Date }>();
  for (const r of recent) {
    for (const [name, s] of Object.entries(r.stats ?? {})) {
      if (!latest.has(name)) latest.set(name, { ok: !s.error || s.found > 0, found: s.found, at: r.at });
    }
  }
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Site status</h3>
      <p className="mt-0.5 text-xs text-mute">From the latest searches. Sites sometimes block automated requests for a while.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {AUTO_SOURCES.map((s) => {
          const h = latest.get(s.name);
          return (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", !h ? "bg-line-2" : h.ok ? "bg-accent" : "bg-bad")} />
                {s.name}
              </span>
              <span className="text-xs text-mute">{!h ? "not used yet" : h.ok ? `${h.found} found · ${ago(h.at)}` : `blocked · use importer`}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

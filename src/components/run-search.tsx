"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Loader2, ChevronDown } from "lucide-react";
import { Button, Notice } from "./ui";
import { cn } from "@/lib/cn";

type RunResult = { jobsFound: number; jobsNew: number; jobsMatched: number; sourceStats: Record<string, { found: number; error?: string }> };
type Src = { id: string; name: string; region: string };

export function RunSearchButton({
  disabledReason, compact = false, sources, defaultOn,
}: { disabledReason?: string; compact?: boolean; sources?: Src[]; defaultOn?: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(defaultOn ?? []));
  const [result, setResult] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function run() {
    setBusy(true);
    setOpen(false);
    setResult(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources: sources ? [...picked] : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Search failed");
      const r: RunResult = data.run;
      const blocked = Object.entries(r.sourceStats).filter(([, v]) => v.error && /40[13]|429/.test(v.error)).map(([k]) => k);
      const failed = Object.entries(r.sourceStats).filter(([k, v]) => v.error && !blocked.includes(k)).map(([k]) => k);
      setResult({
        tone: (failed.length || blocked.length) && !r.jobsFound ? "warn" : "good",
        text: `Found ${r.jobsFound} jobs, ${r.jobsNew} new, ${r.jobsMatched} good matches.` +
          (blocked.length ? ` ${blocked.join(", ")} blocked our server — open them from “Search other sites” and send results with the browser importer.` : "") +
          (failed.length ? ` ${failed.join(", ")} didn't respond this time.` : ""),
      });
      router.refresh();
    } catch (e) {
      setResult({ tone: "bad", text: e instanceof Error ? e.message : "Search failed" });
    } finally {
      setBusy(false);
    }
  }

  const noneSelected = Boolean(sources) && picked.size === 0;
  return (
    <div className={compact ? "relative" : "relative space-y-2"} ref={box}>
      <div className="flex">
        <Button onClick={run} disabled={busy || Boolean(disabledReason) || noneSelected} title={disabledReason} className={cn(sources && "rounded-r-none")}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          {busy ? "Searching job sites…" : sources ? `Search ${picked.size} site${picked.size === 1 ? "" : "s"}` : "Run search now"}
        </Button>
        {sources && (
          <Button onClick={() => setOpen(!open)} disabled={busy} className="rounded-l-none border-l border-white/15 px-2" aria-label="Choose sites">
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>
      {open && sources && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-card p-3 shadow-[0_20px_40px_-20px_rgba(21,23,28,0.35)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Search on</span>
            <button className="text-xs font-medium text-accent hover:underline" onClick={() => setPicked(picked.size === sources.length ? new Set() : new Set(sources.map((s) => s.id)))}>
              {picked.size === sources.length ? "Clear all" : "Select all"}
            </button>
          </div>
          {[...new Set(sources.map((s) => s.region))].map((r) => (
            <div key={r} className="mb-2">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-mute">{r}</div>
              {sources.filter((s) => s.region === r).map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-paper">
                  <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={picked.has(s.id)}
                    onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(s.id); else n.delete(s.id); setPicked(n); }} />
                  {s.name}
                </label>
              ))}
            </div>
          ))}
          <Button className="mt-1 w-full" onClick={run} disabled={noneSelected}>Search {picked.size} site{picked.size === 1 ? "" : "s"}</Button>
        </div>
      )}
      {result && !compact && <Notice tone={result.tone}>{result.text}</Notice>}
      {result && compact && <p className="mt-2 max-w-xs text-xs text-mute">{result.text}</p>}
    </div>
  );
}

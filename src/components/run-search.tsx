"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Loader2 } from "lucide-react";
import { Button, Notice } from "./ui";

type RunResult = { jobsFound: number; jobsNew: number; jobsMatched: number; sourceStats: Record<string, { found: number; error?: string }> };

export function RunSearchButton({ disabledReason, compact = false }: { disabledReason?: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/search", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Search failed");
      const r: RunResult = data.run;
      const failed = Object.entries(r.sourceStats).filter(([, v]) => v.error).map(([k]) => k);
      setResult({
        tone: failed.length && !r.jobsFound ? "warn" : "good",
        text: `Found ${r.jobsFound} jobs, ${r.jobsNew} new, ${r.jobsMatched} good matches.${failed.length ? ` ${failed.join(", ")} didn't respond this time.` : ""}`,
      });
      router.refresh();
    } catch (e) {
      setResult({ tone: "bad", text: e instanceof Error ? e.message : "Search failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      <Button onClick={run} disabled={busy || Boolean(disabledReason)} title={disabledReason}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
        {busy ? "Searching job boards…" : "Run search now"}
      </Button>
      {result && !compact && <Notice tone={result.tone}>{result.text}</Notice>}
      {result && compact && <p className="mt-2 text-xs text-mute">{result.text}</p>}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400); }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-mute hover:bg-ink/5 hover:text-ink"
    >
      {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{ok ? "Copied" : label}
    </button>
  );
}

"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Notice } from "./ui";

export function CvUpload({ current }: { current?: { name: string; when: string } | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cv", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const d = data.detected;
      setMsg({
        tone: "good",
        text: `Read ${file.name}: found ${d.skills} skills${d.titles?.length ? `, titles like “${d.titles[0]}”` : ""}${d.years ? `, about ${d.years} years of experience` : ""}. Check the details below and save.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          drag ? "border-accent bg-accent-soft/60" : "border-line-2 hover:border-ink/30 hover:bg-paper",
        )}
      >
        {busy ? <Loader2 className="size-7 animate-spin text-accent" /> : current ? <FileCheck2 className="size-7 text-accent" /> : <UploadCloud className="size-7 text-mute" />}
        <span className="mt-3 text-sm font-medium">
          {busy ? "Reading your CV…" : current ? "Upload a newer CV" : "Drop your CV here or click to choose"}
        </span>
        <span className="mt-1 text-xs text-mute">
          {current ? `Current: ${current.name} · uploaded ${current.when}` : "PDF, DOCX or TXT · up to 8 MB"}
        </span>
      </button>
      <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}

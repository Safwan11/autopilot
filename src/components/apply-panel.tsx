"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Sparkles, Copy, Check, Loader2, CircleCheckBig } from "lucide-react";
import { generateCoverLetter, markApplied } from "@/app/actions/jobs";
import { Button, Notice, Textarea } from "./ui";

export function ApplyPanel({ jobId, applyUrl, applied, aiAvailable }: { jobId: string; applyUrl: string; applied: boolean; aiAvailable: boolean }) {
  const router = useRouter();
  const [letter, setLetter] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genPending, startGen] = useTransition();
  const [applyPending, startApply] = useTransition();
  const [done, setDone] = useState(applied);

  const gen = () =>
    startGen(async () => {
      const r = await generateCoverLetter(jobId);
      if (r.error) setNote(r.error);
      else {
        setLetter(r.text ?? "");
        setNote(r.ai ? "Written by Claude from your profile. Read it before sending." : "Template draft from your profile. Edit it to add something specific about the company.");
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const apply = () =>
    startApply(async () => {
      await markApplied(jobId, letter || undefined);
      setDone(true);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <a href={applyUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">
          Open application page <ExternalLink className="size-4" />
        </a>
        {done ? (
          <Notice tone="good"><span className="inline-flex items-center gap-1.5"><CircleCheckBig className="size-4" />Tracked in Applications.</span></Notice>
        ) : (
          <Button variant="secondary" onClick={apply} disabled={applyPending} className="h-10">
            {applyPending ? <Loader2 className="size-4 animate-spin" /> : <CircleCheckBig className="size-4" />} I&apos;ve applied — track it
          </Button>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Cover letter</h3>
          <Button variant="ghost" onClick={gen} disabled={genPending} className="h-8 px-2.5">
            {genPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {letter ? "Rewrite" : "Draft one"}
          </Button>
        </div>
        {!letter && !genPending && (
          <p className="mt-1 text-xs text-mute">{aiAvailable ? "Claude writes it from your CV and this job." : "Builds a draft from your profile and the skills this job asks for."}</p>
        )}
        {letter && (
          <div className="mt-2 space-y-2">
            <Textarea value={letter} onChange={(e) => setLetter(e.target.value)} className="min-h-72 text-[13px] leading-relaxed" />
            {note && <p className="text-xs text-mute">{note}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copy} className="h-8">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy"}</Button>
              {done && <Button variant="ghost" className="h-8" onClick={apply} disabled={applyPending}>Save to application</Button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

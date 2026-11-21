"use client";
import { useTransition } from "react";
import { Bookmark, BookmarkCheck, EyeOff, Eye, Loader2 } from "lucide-react";
import { setJobStatus } from "@/app/actions/jobs";
import { cn } from "@/lib/cn";

export function JobQuickActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const set = (s: "new" | "saved" | "hidden") => start(() => setJobStatus(id, s));
  if (status === "applied") return null;
  const btn = "inline-flex size-8 items-center justify-center rounded-md text-mute hover:bg-ink/5 hover:text-ink disabled:opacity-50";
  return (
    <div className="flex items-center gap-0.5">
      {pending ? (
        <Loader2 className="m-2 size-4 animate-spin text-mute" />
      ) : (
        <>
          <button className={cn(btn, status === "saved" && "text-accent")} onClick={() => set(status === "saved" ? "new" : "saved")} title={status === "saved" ? "Unsave" : "Save"} aria-label="Save job">
            {status === "saved" ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          </button>
          <button className={btn} onClick={() => set(status === "hidden" ? "new" : "hidden")} title={status === "hidden" ? "Unhide" : "Not interested"} aria-label="Hide job">
            {status === "hidden" ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        </>
      )}
    </div>
  );
}

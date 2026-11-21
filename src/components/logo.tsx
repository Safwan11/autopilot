import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", dark ? "text-white" : "text-ink")}>
      <span className={cn("flex size-7 items-center justify-center rounded-md", dark ? "bg-white text-ink" : "bg-ink text-white")}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      </span>
      JobPilot
    </Link>
  );
}

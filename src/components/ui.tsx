import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 disabled:bg-mute",
  secondary: "bg-card text-ink border border-line-2 hover:border-ink/40 hover:bg-paper",
  ghost: "text-ink-2 hover:bg-ink/5",
  danger: "bg-card text-bad border border-bad/30 hover:bg-bad-soft",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-9 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(btnBase, variants[variant], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(btnBase, variants[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-line bg-card", className)} {...p} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const field =
  "w-full rounded-lg border border-line-2 bg-card px-3 py-2 text-sm text-ink placeholder:text-mute/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn(field, "h-9", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cn(field, "field-select h-9 py-0 pr-8", className)} {...p} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, hint, ...p }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 hover:border-line-2 has-[:checked]:border-accent/50 has-[:checked]:bg-accent-soft/50">
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-accent)]" {...p} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-mute">{hint}</span>}
      </span>
    </label>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-2",
  good: "bg-accent-soft text-accent-2",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};
export function Badge({ tone = "neutral", className, ...p }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", tones[tone], className)} {...p} />;
}

export function scoreTone(score: number): Tone {
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const tone = scoreTone(score);
  const ring = { good: "border-accent/40 text-accent-2 bg-accent-soft", warn: "border-warn/40 text-warn bg-warn-soft", bad: "border-bad/30 text-bad bg-bad-soft", neutral: "", info: "" }[tone];
  return (
    <div className={cn("num flex shrink-0 flex-col items-center justify-center rounded-lg border font-semibold", ring, size === "lg" ? "size-16 text-2xl" : "size-11 text-base")}>
      {score}
      <span className={cn("font-sans font-medium uppercase tracking-wide opacity-70", size === "lg" ? "text-[10px]" : "text-[8px]")}>match</span>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  const bar = { good: "bg-accent", warn: "bg-warn", bad: "bg-bad", neutral: "bg-mute", info: "bg-info" }[tone];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className="num text-mute">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.max(3, value)}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const inner = (
    <>
      <div className="text-[13px] text-mute">{label}</div>
      <div className="num mt-1 text-[28px] font-semibold leading-none tracking-tight">{value}</div>
      {hint && <div className="mt-2 text-xs text-mute">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-line bg-card p-4 transition-colors hover:border-line-2">{inner}</Link>
  ) : (
    <div className="rounded-xl border border-line bg-card p-4">{inner}</div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink-2">{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-mute">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "good" | "warn" | "bad"; children: ReactNode }) {
  const t = { info: "border-info/20 bg-info-soft text-info", good: "border-accent/25 bg-accent-soft text-accent-2", warn: "border-warn/25 bg-warn-soft text-warn", bad: "border-bad/25 bg-bad-soft text-bad" }[tone];
  return <div className={cn("rounded-lg border px-3.5 py-2.5 text-sm", t)}>{children}</div>;
}

export function Chips({ items, tone = "neutral", max }: { items: string[]; tone?: Tone; max?: number }) {
  const shown = max ? items.slice(0, max) : items;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <Badge key={s} tone={tone} className="font-normal">{s}</Badge>
      ))}
      {max && items.length > max && <Badge className="font-normal">+{items.length - max}</Badge>}
    </div>
  );
}

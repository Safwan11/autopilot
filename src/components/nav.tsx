"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Briefcase, KanbanSquare, UserRound, SlidersHorizontal, MessageSquareText, Settings, LogOut, Menu, X, Puzzle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: KanbanSquare },
  { href: "/profile", label: "Profile & CV", icon: UserRound },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/answers", label: "Answer library", icon: MessageSquareText },
  { href: "/importer", label: "Browser importer", icon: Puzzle },
];

export function Nav({ name, email, counts }: { name: string; email: string; counts: Record<string, number> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {counts[href] ? <span className="num rounded bg-white/10 px-1.5 text-[11px] text-white/80">{counts[href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 pt-3">
      <Link href="/account" onClick={() => setOpen(false)} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm", path === "/account" ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white")}>
        <Settings className="size-4" /> Account
      </Link>
      <form action={logout}>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/65 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
      <div className="mt-3 px-2.5">
        <div className="truncate text-sm font-medium text-white">{name}</div>
        <div className="truncate text-xs text-white/50">{email}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo dark href="/dashboard" />
        <button onClick={() => setOpen(!open)} className="rounded-md p-1.5 text-white" aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 top-[52px] bottom-0 z-30 flex flex-col justify-between overflow-y-auto bg-ink p-3 lg:hidden">
          {links}
          {footer}
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between bg-ink p-3 lg:flex">
        <div>
          <div className="px-2.5 pb-5 pt-2"><Logo dark href="/dashboard" /></div>
          {links}
        </div>
        {footer}
      </aside>
    </>
  );
}

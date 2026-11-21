import { formatDistanceToNowStrict, format } from "date-fns";

export const ago = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  return Math.abs(Date.now() - date.getTime()) < 60_000 ? "just now" : formatDistanceToNowStrict(date, { addSuffix: true });
};
export const day = (d: Date | string | null | undefined) => (d ? format(new Date(d), "d MMM yyyy") : "—");
export const inputDate = (d: Date | string | null | undefined) => (d ? format(new Date(d), "yyyy-MM-dd") : "");

export const APP_STATUS: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "bad" | "info" }> = {
  applied: { label: "Applied", tone: "info" },
  interviewing: { label: "Interviewing", tone: "warn" },
  offer: { label: "Offer", tone: "good" },
  rejected: { label: "Rejected", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/** Request time for server components (rendered per request, so reading the clock is intended). */
export const requestTime = () => Date.now();

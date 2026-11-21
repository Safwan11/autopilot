const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&rsquo;": "'", "&lsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&ndash;": "–", "&mdash;": "—", "&bull;": "•", "&hellip;": "…",
};

/** HTML → readable plain text that keeps paragraphs and bullet points. */
export function htmlToText(html: string): string {
  if (!html) return "";
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<\/(p|div|h[1-6]|tr|section)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
       .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
       .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ");
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== "" && !(arr[i + 1] ?? "").startsWith("•")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitList(input: string | null | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,\n;]+/)) {
    const v = raw.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

export function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9#+.]+/).filter((t) => t.length > 1 && !STOP.has(t));
}
const STOP = new Set(["and", "or", "the", "of", "for", "in", "to", "a", "an", "with", "at", "on", "senior", "junior", "sr", "jr", "ii", "iii", "i", "lead", "mid", "level"]);

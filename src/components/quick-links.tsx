"use client";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Select } from "./ui";

export type LinkMatrix = {
  keywords: string[];
  places: { code: string; name: string }[]; // "" = anywhere
  links: { id: string; name: string; region: string; urls: Record<string, string> }[]; // key `${keywordIndex}|${placeCode}`
};

export function QuickLinks({ data }: { data: LinkMatrix }) {
  const [k, setK] = useState(0);
  const [place, setPlace] = useState(data.places[0]?.code ?? "");
  if (!data.keywords.length || !data.links.length) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={k} onChange={(e) => setK(Number(e.target.value))} aria-label="Keyword" className="text-xs">
          {data.keywords.map((kw, i) => <option key={kw} value={i}>{kw}</option>)}
        </Select>
        <Select value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Country" className="text-xs">
          {data.places.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.links.map((l) => (
          <a key={l.id} href={l.urls[`${k}|${place}`]} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:border-line-2 hover:bg-paper">
            {l.name}<ExternalLink className="size-3 text-mute" />
          </a>
        ))}
      </div>
    </div>
  );
}

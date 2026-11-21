import Link from "next/link";
import { MapPin, Clock, Banknote } from "lucide-react";
import type { Job } from "@/db/schema";
import { ago } from "@/lib/format";
import { Badge, Chips, ScoreBadge } from "./ui";
import { JobQuickActions } from "./job-actions";

export function JobRow({ job }: { job: Job }) {
  return (
    <li className="group flex gap-4 px-4 py-4 sm:px-5">
      <ScoreBadge score={job.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/jobs/${job.id}`} className="block font-medium leading-snug hover:underline underline-offset-4">
              {job.title}
            </Link>
            <div className="mt-0.5 text-sm text-ink-2">{job.company}</div>
          </div>
          <JobQuickActions id={job.id} status={job.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{job.location}</span>}
          {job.remoteType && <Badge tone={job.remoteType === "Remote" ? "info" : "neutral"}>{job.remoteType}</Badge>}
          {job.salary && <span className="inline-flex items-center gap-1"><Banknote className="size-3" />{job.salary}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="size-3" />{job.postedAt ? ago(job.postedAt) : `found ${ago(job.createdAt)}`}</span>
          <span>{job.source}</span>
          {job.status === "saved" && <Badge tone="good">Saved</Badge>}
          {job.status === "applied" && <Badge tone="info">Applied</Badge>}
          {job.aiScored && <Badge tone="neutral">AI scored</Badge>}
        </div>
        {job.matchedSkills.length > 0 && <div className="mt-2.5"><Chips items={job.matchedSkills} tone="good" max={6} /></div>}
      </div>
    </li>
  );
}

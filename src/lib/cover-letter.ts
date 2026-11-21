import "server-only";
import type { Job, Profile, User } from "@/db/schema";
import { askClaude } from "./ai";

export async function writeCoverLetter(job: Job, profile: Profile | undefined, user: User): Promise<{ text: string; ai: boolean }> {
  const name = profile?.fullName || user.name || "";
  const ai = await askClaude(
    `Write a concise, specific cover letter (max 220 words, 3 short paragraphs, no placeholders, no invented facts) for this candidate and job. Use only facts from the candidate profile. Plain text, sign off with the candidate's name.

CANDIDATE: ${name}
Headline: ${profile?.headline ?? ""}
Years of experience: ${profile?.yearsExperience ?? "not stated"}
Skills: ${(profile?.skills ?? []).join(", ")}
Summary: ${(profile?.summary ?? "").slice(0, 800)}
CV excerpt: ${(profile?.cvText ?? "").slice(0, 2500)}

JOB: ${job.title} at ${job.company} (${job.location ?? ""})
${job.description.slice(0, 3000)}`,
    700,
  );
  if (ai) return { text: ai.trim(), ai: true };

  const skills = (job.matchedSkills?.length ? job.matchedSkills : profile?.skills ?? []).slice(0, 4);
  const years = profile?.yearsExperience ? `${profile.yearsExperience}+ years of experience` : "hands-on experience";
  const role = profile?.headline || profile?.titles?.[0] || "professional";
  const text = `Dear Hiring Team at ${job.company},

I'm applying for the ${job.title} position. As a ${role} with ${years}, I've worked across ${skills.length ? skills.join(", ") : "the areas this role covers"}, and I'm confident I can contribute from day one.

${profile?.summary ? profile.summary.split(/(?<=\.)\s/).slice(0, 2).join(" ") + "\n\n" : ""}What draws me to ${job.company} is the chance to apply these skills in a role focused on ${job.title.toLowerCase()}. I'm organised, quick to learn new systems, and comfortable working with both technical teams and end users.

I'd welcome the chance to discuss how I can help. Thank you for your time and consideration.

Kind regards,
${name}`.replace(/\n{3,}/g, "\n\n");
  return { text, ai: false };
}

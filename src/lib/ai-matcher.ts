export interface MatchResult {
  score: number;
  classification: string;
  strongSkills: string[];
  missingReqs: string[];
  reasoning: string;
  eligible: boolean;
  eligibilityIssues: string[];
}

const CLASSIFY = (s: number) =>
  s >= 90 ? "Excellent match" :
  s >= 80 ? "Strong match" :
  s >= 70 ? "Good match" :
  s >= 60 ? "Potential match" : "Low priority";

export async function scoreJob(
  cvText: string,
  profile: { titles: string[]; skills: string[]; yearsExp?: number | null },
  job: { title: string; company: string; description: string; location: string }
): Promise<MatchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : (process.env.OPENAI_API_KEY ? "openai" : null);

  if (!apiKey || !provider) {
    return heuristicScore(profile, job);
  }

  const prompt = `You are a job-matching engine. Score how well this candidate fits this vacancy from 0-100.

CANDIDATE CV (source of truth):
${cvText.slice(0, 6000)}

CANDIDATE PROFILE:
Titles: ${profile.titles.join(", ")}
Skills: ${profile.skills.join(", ")}
Years experience: ${profile.yearsExp ?? "unknown"}

VACANCY:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.slice(0, 4000)}

Return ONLY valid JSON with these fields:
{
  "score": number 0-100,
  "strongSkills": string[] (max 8 skills the candidate has that match),
  "missingReqs": string[] (max 6 requirements the candidate lacks),
  "reasoning": string (2-3 sentences explaining the score),
  "eligible": boolean,
  "eligibilityIssues": string[] (e.g. "requires 5+ years", "visa sponsorship not offered", "citizens only")
}`;

  try {
    let text = "";
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data?.content?.[0]?.text || "";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      text = data?.choices?.[0]?.message?.content || "";
    }
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    const score = Math.max(0, Math.min(100, Math.round(json.score ?? 0)));
    return {
      score,
      classification: CLASSIFY(score),
      strongSkills: json.strongSkills || [],
      missingReqs: json.missingReqs || [],
      reasoning: json.reasoning || "",
      eligible: json.eligible !== false,
      eligibilityIssues: json.eligibilityIssues || [],
    };
  } catch (e) {
    console.error("AI scoring failed, falling back to heuristic", e);
    return heuristicScore(profile, job);
  }
}

function heuristicScore(profile: { skills: string[] }, job: { title: string; description: string }): MatchResult {
  const lower = (job.title + " " + job.description).toLowerCase();
  const matched = profile.skills.filter((s) => lower.includes(s.toLowerCase()));
  const score = Math.min(95, 40 + matched.length * 6);
  return {
    score,
    classification: CLASSIFY(score),
    strongSkills: matched.slice(0, 8),
    missingReqs: [],
    reasoning: `Heuristic match based on ${matched.length} overlapping skills (no AI key configured).`,
    eligible: true,
    eligibilityIssues: [],
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped JSON from third-party APIs */
import "server-only";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** One-shot Claude call. Returns null when no key is configured or the call fails. */
export async function askClaude(prompt: string, maxTokens = 800): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) {
      console.error("Claude API error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return data?.content?.find((c: any) => c.type === "text")?.text ?? null;
  } catch (e) {
    console.error("Claude API call failed", e);
    return null;
  }
}

export function parseJsonLoose<T>(text: string | null): T | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

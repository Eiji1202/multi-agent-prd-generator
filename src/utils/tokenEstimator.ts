import { log } from "./logger";

// Rough estimate: ~4 characters per token (GPT/Claude heuristic)
const CHARS_PER_TOKEN = 4;
const CONTEXT_LIMIT = 180_000; // claude-sonnet-4-5 context window (tokens)

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function logTokenEstimate(agentName: string, ...texts: string[]): void {
  const total = texts.reduce((sum, t) => sum + estimateTokens(t), 0);
  const pct = ((total / CONTEXT_LIMIT) * 100).toFixed(1);
  log(agentName, `Estimated input tokens: ~${total.toLocaleString()} (${pct}% of ${CONTEXT_LIMIT.toLocaleString()} limit)`);
  if (total > CONTEXT_LIMIT * 0.8) {
    log(agentName, "WARNING: Approaching context limit — consider summarizing upstream outputs.");
  }
}

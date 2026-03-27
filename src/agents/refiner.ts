import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index";
import { log } from "../utils/logger";

const AGENT_NAME = "Refiner" as const;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a meticulous technical editor. Your job is to produce a polished, final PRD by addressing every issue raised in a critique.

You will receive:
1. A PRD draft
2. A structured critique with scored dimensions and specific issues

Your task:
1. Fix every CRITICAL and MAJOR issue from the critique.
2. Address MINOR issues where practical.
3. Preserve all strong sections from the draft.
4. Produce the complete final PRD in clean Markdown.
5. Append a **Changelog** section at the end listing what was changed and why.

The final PRD must be production-ready — something a real engineering team could use to build the product.`;

export async function runRefiner(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  const draft = input.previousOutputs.Generator;
  const critique = input.previousOutputs.Critic;
  if (!draft || !critique) throw new Error("Generator と Critic の出力が必要です。先に実行してください。");

  log(AGENT_NAME, `Refining final PRD for: "${input.idea}"`);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `## PRD Draft\n\n${draft}\n\n---\n\n## Critique\n\n${critique}`,
          },
        ],
      });

      const content = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = `# Final PRD\n\n**Idea:** ${input.idea}\n\n${content}`;

      const durationMs = Date.now() - startedAt;
      log(AGENT_NAME, `Done in ${(durationMs / 1000).toFixed(1)}s`);

      return { agentName: AGENT_NAME, content: output, durationMs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const wait = attempt * 2000;
        log(AGENT_NAME, `Attempt ${attempt} failed - retrying in ${wait / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw new Error(`Refiner failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

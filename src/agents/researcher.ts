import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index";
import { saveOutput } from "../utils/fileUtils";
import { log } from "../utils/logger";

const OUTPUT_PATH = "outputs/01_research.md";
const AGENT_NAME = "Researcher" as const;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a senior product researcher. Given a one-line product idea, produce a thorough research report covering:

1. **Problem Space** – What core problem does this solve? Why does it matter?
2. **Target Users** – Who are the primary and secondary users? Describe their pain points in detail.
3. **Existing Solutions** – List 3–5 competitors or alternatives. What do they do well and poorly?
4. **Market Insights** – Market size estimate, growth trends, and relevant industry dynamics.
5. **Key Requirements** – Based on the above, list 5–8 must-have capabilities for a successful product.

Write in clear, structured markdown. Be specific and evidence-based. Avoid fluff.`;

export async function runResearcher(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  log(AGENT_NAME, `Starting research for: "${input.idea}"`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Product idea: ${input.idea}`,
          },
        ],
      });

      const content = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = `# Research Report\n\n**Idea:** ${input.idea}\n\n${content}`;

      await saveOutput(OUTPUT_PATH, output);
      const durationMs = Date.now() - startedAt;
      log(AGENT_NAME, `Done in ${(durationMs / 1000).toFixed(1)}s → ${OUTPUT_PATH}`);

      return {
        agentName: AGENT_NAME,
        outputPath: OUTPUT_PATH,
        content: output,
        durationMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const wait = attempt * 2000;
        log(AGENT_NAME, `Attempt ${attempt} failed — retrying in ${wait / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw new Error(`Researcher failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index";
import { loadOutput, saveOutput } from "../utils/fileUtils";
import { log } from "../utils/logger";

const OUTPUT_PATH = "outputs/03_prd_draft.md";
const AGENT_NAME = "Generator" as const;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a senior product manager at a top-tier tech company. Write a comprehensive Product Requirements Document (PRD) based on the provided outline and research.

Your PRD must include all of these sections:

## 1. Overview
A concise executive summary of the product, the problem it solves, and who it's for.

## 2. Goals
3–5 specific, measurable goals (use OKR-style where possible).

## 3. Non-Goals
2–3 explicit items that are out of scope for this version.

## 4. Target Users & Personas
Describe 2–3 user personas with their background, pain points, and goals.

## 5. User Stories
At least 5 detailed user stories in "As a [role], I want [action], so that [benefit]" format.

## 6. Functional Requirements
A numbered list of specific features and behaviors. Each requirement must be:
- Specific (not vague)
- Testable (you can verify it's met)
- Prioritized: Must / Should / Could

## 7. Non-Functional Requirements
Performance, security, scalability, accessibility, and compliance requirements.

## 8. Success Metrics
How will you know this product succeeded? List 3–5 measurable KPIs.

## 9. Open Questions
Unresolved decisions, risks, or areas needing further research.

Be thorough and specific. Avoid generic filler. Write as if this document will be used to build the product.`;

export async function runGenerator(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  log(AGENT_NAME, "Reading outline…");
  const outline = await loadOutput("outputs/02_outline.md");

  log(AGENT_NAME, `Generating full PRD draft for: "${input.idea}"`);
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
            content: `Product idea: ${input.idea}\n\n---\n\n${outline}`,
          },
        ],
      });

      const content = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = `# PRD Draft\n\n**Idea:** ${input.idea}\n\n${content}`;
      await saveOutput(OUTPUT_PATH, output);

      const durationMs = Date.now() - startedAt;
      log(AGENT_NAME, `Done in ${(durationMs / 1000).toFixed(1)}s → ${OUTPUT_PATH}`);

      return { agentName: AGENT_NAME, outputPath: OUTPUT_PATH, content: output, durationMs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const wait = attempt * 2000;
        log(AGENT_NAME, `Attempt ${attempt} failed — retrying in ${wait / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw new Error(`Generator failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

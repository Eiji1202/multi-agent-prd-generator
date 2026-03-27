import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index";
import { log } from "../utils/logger";

const AGENT_NAME = "Planner" as const;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a principal product strategist. Your job is to design the structure of a Product Requirements Document (PRD), NOT to write the full content.

Given a research report, produce a PRD outline that includes:

1. **Document Title** – A concise, descriptive product name.
2. **Strategic Goals** – 3–5 measurable goals the product must achieve.
3. **Non-Goals** – 2–3 explicit out-of-scope items to prevent scope creep.
4. **Sections** – List each PRD section with a one-sentence description of what it should cover:
   - Overview
   - Target Users & Personas
   - User Stories
   - Functional Requirements
   - Non-Functional Requirements
   - Success Metrics
   - Open Questions
5. **User Story Skeletons** – 3–5 high-level user stories in "As a … I want … so that …" format.

Keep this structural — do NOT write detailed content. The Generator agent will fill in the details.
Write in clean Markdown.`;

export async function runPlanner(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  const research = input.previousOutputs.Researcher;
  if (!research) throw new Error("Researcher の出力がありません。先に Researcher を実行してください。");

  log(AGENT_NAME, `Planning PRD structure for: "${input.idea}"`);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Product idea: ${input.idea}\n\n---\n\n${research}`,
          },
        ],
      });

      const content = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = `# PRD Outline\n\n**Idea:** ${input.idea}\n\n${content}`;

      const durationMs = Date.now() - startedAt;
      log(AGENT_NAME, `Done in ${(durationMs / 1000).toFixed(1)}s`);

      return { agentName: AGENT_NAME, content: output, durationMs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const wait = attempt * 2000;
        log(AGENT_NAME, `Attempt ${attempt} failed — retrying in ${wait / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw new Error(`Planner failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index.js";
import { loadOutput, saveOutput } from "../utils/fileUtils.js";
import { log } from "../utils/logger.js";

const OUTPUT_PATH = "outputs/04_critique.md";
const AGENT_NAME = "Critic" as const;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a ruthlessly rigorous product critic. Your sole job is to find problems in a PRD — NOT to praise it.

## Scoring Rubric

Score the PRD on each of these 4 dimensions from 1 (terrible) to 5 (excellent):

### 1. Completeness (1–5)
Are all standard PRD sections present and non-empty?
- 5: All sections present, detailed, and complete
- 3: Most sections present but some are thin or missing
- 1: Major sections missing entirely

### 2. Clarity (1–5)
Are requirements specific, unambiguous, and testable?
- 5: Every requirement is specific and verifiable
- 3: Some requirements are vague or untestable
- 1: Most requirements are vague or contradictory

### 3. Feasibility (1–5)
Is the scope realistic for a real product team?
- 5: Scope is well-defined, realistic, and prioritized
- 3: Some scope concerns or unrealistic expectations
- 1: Massively over-scoped or technically infeasible

### 4. User Focus (1–5)
Is there a clear, specific user problem being solved?
- 5: Tight user focus with validated pain points
- 3: Users mentioned but problem is generic or assumed
- 1: No clear user problem — solution in search of a problem

## Output Format

Produce your critique in this exact structure:

### Scores
| Dimension | Score | Justification |
|-----------|-------|---------------|
| Completeness | X/5 | ... |
| Clarity | X/5 | ... |
| Feasibility | X/5 | ... |
| User Focus | X/5 | ... |
| **Overall** | **X/20** | |

### Critical Issues (score ≤ 2 in any dimension)
List any dimensions that scored ≤ 2 and why they are blockers.

### Issues Found
For each issue, use this format:
- **[CRITICAL/MAJOR/MINOR]** [Section]: [Specific problem]. [Why it matters]. [What should be done instead].

You MUST find at least 3 issues. If you cannot find 3 real issues, your standards are too low.

### What's Missing
List concrete things that should be in the PRD but aren't.

Do NOT say anything positive. Do NOT soften criticism. Be direct and specific.`;

export async function runCritic(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  log(AGENT_NAME, "Reading PRD draft…");
  const draft = await loadOutput("outputs/03_prd_draft.md");

  log(AGENT_NAME, `Critiquing PRD for: "${input.idea}"`);
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
            content: `Find every problem with this PRD. Be merciless.\n\n---\n\n${draft}`,
          },
        ],
      });

      const content = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = `# PRD Critique\n\n**Idea:** ${input.idea}\n\n${content}`;
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

  throw new Error(`Critic failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

import Anthropic from "@anthropic-ai/sdk";
import { AgentInput, AgentOutput } from "../types/index";
import { log } from "../utils/logger";

const AGENT_NAME = "Critic" as const;
const MAX_RETRIES = 3;

// ─── Specialist prompts ────────────────────────────────────────────────────────

const UX_CRITIC_PROMPT = `You are a ruthless UX/Design critic reviewing a PRD. Focus ONLY on user experience issues.

Find problems with:
- User personas (are they specific enough? do they have real pain points?)
- User stories (are they meaningful? do they cover edge cases?)
- User flows and interactions (what's unclear or missing?)
- Accessibility and inclusivity gaps
- Assumptions about user behavior that aren't validated

Format your output as:
### UX/Design Issues
For each issue: **[CRITICAL/MAJOR/MINOR]** [Section]: [Problem]. [Why it matters]. [Fix].

You MUST find at least 2 issues. Be specific and direct.`;

const TECH_CRITIC_PROMPT = `You are a ruthless Technical Feasibility critic reviewing a PRD. Focus ONLY on technical issues.

Find problems with:
- Non-functional requirements (are they specific and measurable?)
- Technical feasibility (is anything unrealistic or under-specified?)
- Security and privacy gaps
- Scalability assumptions
- Missing integration or infrastructure requirements
- Testability of requirements

Format your output as:
### Technical Issues
For each issue: **[CRITICAL/MAJOR/MINOR]** [Section]: [Problem]. [Why it matters]. [Fix].

You MUST find at least 2 issues. Be specific and direct.`;

const BUSINESS_CRITIC_PROMPT = `You are a ruthless Business/Market critic reviewing a PRD. Focus ONLY on business issues.

Find problems with:
- Goal clarity (are goals specific, measurable, time-bound?)
- Success metrics (are KPIs actionable? do they cover leading AND lagging indicators?)
- Scope creep risk (what's undefined that could expand scope?)
- Competitive differentiation (is the value proposition clear?)
- Missing stakeholder considerations
- Open questions that are blockers, not nice-to-haves

Format your output as:
### Business/Market Issues
For each issue: **[CRITICAL/MAJOR/MINOR]** [Section]: [Problem]. [Why it matters]. [Fix].

You MUST find at least 2 issues. Be specific and direct.`;

const SYNTHESIZER_PROMPT = `You are a lead product critic synthesizing feedback from three specialist reviewers.

Given UX, Technical, and Business critiques of a PRD, produce a final consolidated critique:

### Overall Score
| Dimension | Score | Justification |
|-----------|-------|---------------|
| UX / User Focus | X/5 | ... |
| Technical Feasibility | X/5 | ... |
| Business Clarity | X/5 | ... |
| **Overall** | **X/15** | |

### Top 3 Blockers
The most critical issues that MUST be fixed before this PRD can be acted on.

### All Issues (prioritized)
Merge and deduplicate all issues from the three reviews. Format:
- **[CRITICAL/MAJOR/MINOR]** [Section]: [Problem]. [Fix].

### Summary Recommendation
One paragraph: what the Refiner must focus on most to improve this PRD.`;

// ─── Helper: run one specialist critic ────────────────────────────────────────

async function runSpecialist(
  client: Anthropic,
  role: string,
  systemPrompt: string,
  draft: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Review this PRD from your specialist perspective:\n\n---\n\n${draft}`,
      },
    ],
  });

  log(AGENT_NAME, `${role} review complete`);

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runCritic(
  client: Anthropic,
  input: AgentInput
): Promise<AgentOutput> {
  const startedAt = Date.now();
  const draft = input.previousOutputs.Generator;
  if (!draft) throw new Error("Generator の出力がありません。先に Generator を実行してください。");

  log(AGENT_NAME, "Running UX, Technical, and Business critics in parallel…");
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // ── Parallel phase: 3 specialists run concurrently ──────────────────────
      const [uxFeedback, techFeedback, bizFeedback] = await Promise.all([
        runSpecialist(client, "UX/Design", UX_CRITIC_PROMPT, draft),
        runSpecialist(client, "Technical", TECH_CRITIC_PROMPT, draft),
        runSpecialist(client, "Business", BUSINESS_CRITIC_PROMPT, draft),
      ]);

      // ── Sequential phase: synthesize the three reviews ──────────────────────
      log(AGENT_NAME, "Synthesizing parallel critiques…");
      const synthesis = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 3072,
        system: SYNTHESIZER_PROMPT,
        messages: [
          {
            role: "user",
            content: `Synthesize these three specialist reviews into a final critique.\n\n---\n\n## UX/Design Review\n${uxFeedback}\n\n## Technical Review\n${techFeedback}\n\n## Business Review\n${bizFeedback}`,
          },
        ],
      });

      const synthesisText = synthesis.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const output = [
        `# PRD Critique`,
        ``,
        `**Idea:** ${input.idea}`,
        ``,
        `## UX/Design Review`,
        uxFeedback,
        ``,
        `## Technical Review`,
        techFeedback,
        ``,
        `## Business/Market Review`,
        bizFeedback,
        ``,
        `---`,
        ``,
        `## Synthesized Critique`,
        synthesisText,
      ].join("\n");

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

  throw new Error(`Critic failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

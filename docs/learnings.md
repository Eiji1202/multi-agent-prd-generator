# Multi-Agent Harness Design: Learnings

Observations from building a 5-agent PRD generation pipeline, informed by [Anthropic's harness design article](https://www.anthropic.com/engineering/harness-design-long-running-apps).

---

## 1. Separation of concerns produces better output quality

Splitting the work into Researcher → Planner → Generator produces noticeably better PRDs than asking a single agent to "write a PRD for X". Each agent can go deep on its specific task without being distracted by the others.

The Planner–Generator split is particularly valuable: the Planner designs structure without worrying about content quality; the Generator writes content without worrying about structure. A single "write PRD" agent has to do both simultaneously, and usually does both poorly.

---

## 2. Self-evaluation bias is a real and serious failure mode

When asked to critique its own work, an LLM will almost always find it "pretty good with a few minor suggestions". This is self-evaluation bias.

The fix is a **separate Critic agent with an explicit adversarial stance**: "Do NOT praise the work. Find problems." Tuning a standalone evaluator to be skeptical is far more tractable than making a generator critical of its own output. The structured scoring rubric (4 dimensions, 1–5 scale) further forces specific, gradable feedback rather than vague praise.

---

## 3. File-based handoffs make pipelines inspectable and resumable

Writing each agent's output to a numbered Markdown file (`01_research.md`, `02_outline.md`, etc.) provides two major benefits:

- **Inspectability**: at any point you can open a file and see exactly what an agent produced. This is invaluable for debugging prompt issues.
- **Resumability**: if Agent 3 fails, you can fix the issue and resume from Agent 3 without re-running Agents 1 and 2 (which cost API calls and time).

In-memory state passing would lose both properties.

---

## 4. Context should be as lean as possible per agent

Each agent receives only what it needs — typically just its immediate upstream output. The Generator gets the outline, not the full research report. The Critic gets the draft, not the outline.

This matters for two reasons:
- **Cost**: fewer tokens per call
- **Context anxiety**: agents given very long context windows tend to "wrap up" their work prematurely as if running out of space, even when they aren't. Keeping context lean prevents this.

The exception is the Refiner, which genuinely needs both the draft and the critique to do its job.

---

## 5. Retry logic with exponential backoff is essential for production reliability

API calls fail. Network hiccups, rate limits, and transient errors are all real. Every agent in this pipeline uses 3-attempt retry logic with exponential backoff (2s, 4s). Without this, a single flaky API call would fail the entire pipeline run.

The pattern is simple but the discipline matters: retry at the agent level (not the orchestrator level), so the orchestrator only sees clean success/failure signals.

---

## 6. Explicit non-goals prevent scope creep in generated content

Adding a "Non-Goals" section to the PRD structure and including explicit Planner instructions to define out-of-scope items prevents the Generator from writing an aspirational document that tries to do everything. LLMs default to expansive, comprehensive output — the pipeline structure needs to actively counteract this.

---

## 7. The pipeline structure itself is a form of prompt engineering

The order and framing of agents shapes the final output as much as any individual system prompt. Putting research before planning before writing ensures the PRD is grounded in reality. Putting the Critic before the Refiner ensures improvements are evidence-based. Changing the pipeline order would produce meaningfully different (and likely worse) results.

# Context Management & Handoff Design

## Strategy

Each agent receives **only what it needs** — its system prompt plus the single upstream output. This keeps context lean and prevents "context anxiety" (agents prematurely wrapping up as the window fills).

| Agent | Context received |
|-------|-----------------|
| Researcher | idea only |
| Planner | idea + `01_research.md` |
| Generator | idea + `02_outline.md` |
| Critic | `03_prd_draft.md` only |
| Refiner | `03_prd_draft.md` + `04_critique.md` |

## Token Budget

Model: `claude-sonnet-4-5` — 200K token context window.

Estimated token sizes per artifact:
- Research report: ~1,500–3,000 tokens
- PRD outline: ~800–1,500 tokens  
- PRD draft: ~2,000–4,000 tokens
- Critique: ~1,000–2,000 tokens

All artifacts fit comfortably within the context window. Token estimation is logged before each API call using `src/utils/tokenEstimator.ts`.

## File-Based Handoff

Outputs are written to `outputs/` as numbered Markdown files:

```
outputs/
  01_research.md
  02_outline.md
  03_prd_draft.md
  04_critique.md
  05_final_prd.md
```

Each file includes a YAML front-matter header with agent name, model, and timestamp — making intermediate outputs fully inspectable.

## Resume Capability

The orchestrator checks for existing output files before running each agent. If a file exists, the agent is skipped. This allows mid-pipeline resumption after failures without re-running expensive agents.

## References

- [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)

# Critic Evaluation Rubric

The Critic agent scores PRDs on 4 dimensions (1–5 each, 20 points total).

## Dimensions

| Dimension | What it measures |
|-----------|-----------------|
| **Completeness** | Are all standard PRD sections present and non-empty? |
| **Clarity** | Are requirements specific, unambiguous, and testable? |
| **Feasibility** | Is the scope realistic for a real product team? |
| **User Focus** | Is there a clear, specific user problem being solved? |

## Scoring Scale

| Score | Meaning |
|-------|---------|
| 5 | Excellent — no meaningful gaps |
| 4 | Good — minor gaps only |
| 3 | Adequate — some gaps that should be addressed |
| 2 | Poor — significant problems (**triggers critical issue flag**) |
| 1 | Unacceptable — fundamental failure |

## Critical Issue Threshold

Any dimension scoring **≤ 2** is flagged as a **critical issue** and must be addressed before the Refiner runs.

## Issue Severity Labels

| Label | Definition |
|-------|-----------|
| **CRITICAL** | Blocker — the PRD cannot be acted on without fixing this |
| **MAJOR** | Significant gap that will cause problems during development |
| **MINOR** | Improvement that would increase quality but is not blocking |

## Design Rationale

Per [Anthropic's harness design article](https://www.anthropic.com/engineering/harness-design-long-running-apps):

> "Tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work."

The Critic is explicitly instructed **not to praise** the work. Self-evaluation bias is a known failure mode — a separate critic agent with a strict rubric is more reliable than asking the generator to self-critique.

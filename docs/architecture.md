# Architecture Deep-Dive

## Overview

The pipeline is a **linear sequence of 5 specialized agents**. Each agent is stateless — it reads from disk and writes to disk, with no shared in-memory state between agents. This makes the pipeline:

- **Inspectable**: open any `outputs/0X_*.md` to see exactly what each agent produced
- **Resumable**: the orchestrator skips agents whose output files already exist
- **Debuggable**: failures are isolated to a single agent

---

## Agent 1: Researcher

**File:** `src/agents/researcher.ts`
**Input:** idea string
**Output:** `outputs/01_research.md`

Generates a structured market research report covering:
- Problem space and why it matters
- Target users and their pain points
- 3–5 existing solutions/competitors
- Market size and growth trends
- 5–8 key requirements derived from the above

The Researcher has no upstream context — it starts fresh from the raw idea. This prevents premature anchoring on a specific solution.

---

## Agent 2: Planner

**File:** `src/agents/planner.ts`
**Input:** idea + `01_research.md`
**Output:** `outputs/02_outline.md`

Designs the **structure** of the PRD without writing its content. Produces:
- Document title
- Strategic goals and non-goals
- Section list with one-sentence descriptions
- User story skeletons

Keeping Planner and Generator separate prevents the Generator from having to simultaneously design structure and write content — a cognitive load that leads to shallow PRDs.

---

## Agent 3: Generator

**File:** `src/agents/generator.ts`
**Input:** idea + `02_outline.md`
**Output:** `outputs/03_prd_draft.md`

Writes the full PRD following the Planner's outline. Covers all standard PRD sections:
- Overview, Goals, Non-Goals
- Target Users & Personas
- User Stories
- Functional & Non-Functional Requirements (Must/Should/Could)
- Success Metrics
- Open Questions

The Generator receives only the outline (not the full research report) to keep context focused and prevent information overload.

---

## Agent 4: Critic

**File:** `src/agents/critic.ts`
**Input:** `03_prd_draft.md`
**Output:** `outputs/04_critique.md`

A deliberately skeptical reviewer that scores the PRD on 4 dimensions (1–5 each):

| Dimension | What it tests |
|-----------|--------------|
| Completeness | All sections present and non-empty |
| Clarity | Requirements are specific and testable |
| Feasibility | Scope is realistic |
| User Focus | Clear user problem being solved |

The Critic is explicitly instructed not to praise the work. Self-evaluation bias is a key failure mode in LLM pipelines — a separate critic with a strict rubric is more reliable.

See [evaluation-rubric.md](evaluation-rubric.md) for the full rubric.

---

## Agent 5: Refiner

**File:** `src/agents/refiner.ts`
**Input:** `03_prd_draft.md` + `04_critique.md`
**Output:** `outputs/05_final_prd.md`

Produces the polished final PRD by:
1. Fixing all CRITICAL and MAJOR issues from the critique
2. Addressing MINOR issues where practical
3. Appending a Changelog section showing what was changed and why

The Refiner is the only agent that receives two upstream files. Both are needed: the draft as the base document, and the critique as the editing guide.

---

## Orchestrator

**File:** `src/pipeline/orchestrator.ts`

Runs agents sequentially, passing a shared `PipelineState` object. Key behaviors:

- **Resume support**: checks for existing output files, skips completed agents
- **Failure isolation**: catches per-agent errors and reports them clearly
- **Summary logging**: prints total time and output path when complete

---

## Data Flow

```
CLI input (idea)
    │
    ▼
Orchestrator (PipelineState)
    │
    ├─→ Researcher ──writes──→ outputs/01_research.md
    │        ↑ reads idea only
    │
    ├─→ Planner ────writes──→ outputs/02_outline.md
    │        ↑ reads 01_research.md
    │
    ├─→ Generator ──writes──→ outputs/03_prd_draft.md
    │        ↑ reads 02_outline.md
    │
    ├─→ Critic ─────writes──→ outputs/04_critique.md
    │        ↑ reads 03_prd_draft.md
    │
    └─→ Refiner ────writes──→ outputs/05_final_prd.md
             ↑ reads 03_prd_draft.md + 04_critique.md
```

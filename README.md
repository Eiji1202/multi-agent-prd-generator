# multi-agent-prd-generator

A 5-agent pipeline that transforms a one-line idea into a full Product Requirements Document (PRD). Built with the Claude SDK to learn multi-agent harness design.

## Architecture

```
idea (string)
    │
    ▼
┌─────────────┐
│  Researcher  │  → outputs/01_research.md
└─────────────┘
    │
    ▼
┌─────────────┐
│   Planner   │  → outputs/02_outline.md
└─────────────┘
    │
    ▼
┌─────────────┐
│  Generator  │  → outputs/03_prd_draft.md
└─────────────┘
    │
    ▼
┌─────────────┐
│    Critic   │  → outputs/04_critique.md
└─────────────┘
    │
    ▼
┌─────────────┐
│   Refiner   │  → outputs/05_final_prd.md
└─────────────┘
```

Each agent reads the previous agent's output from `outputs/` and writes its own result, creating a clean file-based handoff chain.

## Quickstart

```bash
# Install dependencies
npm install

# Configure API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

# Run the pipeline
npm run dev -- "Your product idea here"
```

## Directory Structure

```
src/
├── agents/      # Individual agent implementations
├── pipeline/    # Orchestrator that runs agents in sequence
├── types/       # Shared TypeScript interfaces
└── utils/       # Helpers (file I/O, logging)
outputs/         # Generated markdown files (gitignored)
```

## References

- [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)

import "dotenv/config";
import { runPipeline } from "./pipeline/orchestrator";

function printBanner(idea: string): void {
  console.log("\n┌─────────────────────────────────────────────┐");
  console.log("│       Multi-Agent PRD Generator             │");
  console.log("└─────────────────────────────────────────────┘");
  console.log(`\nIdea: "${idea}"\n`);
  console.log("Pipeline:");
  console.log("  1. Researcher  → outputs/01_research.md");
  console.log("  2. Planner     → outputs/02_outline.md");
  console.log("  3. Generator   → outputs/03_prd_draft.md");
  console.log("  4. Critic      → outputs/04_critique.md");
  console.log("  5. Refiner     → outputs/05_final_prd.md");
  console.log("");
}

async function main(): Promise<void> {
  const idea = process.argv[2]?.trim();

  if (!idea) {
    console.error('Usage: npm run dev -- "Your product idea here"');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set.");
    console.error("Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  printBanner(idea);

  const state = await runPipeline(idea);

  console.log("\n✓ Done!");
  console.log(`  Completed agents: ${state.completedAgents.join(" → ")}`);
  console.log("  Final PRD: outputs/05_final_prd.md\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});

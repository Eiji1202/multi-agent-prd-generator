import "dotenv/config";
import { runPipeline } from "./pipeline/orchestrator.js";

const idea = process.argv.slice(2).join(" ").trim();

if (!idea) {
  console.error("Usage: npm run dev -- \"<your product idea>\"");
  console.error("Example: npm run dev -- \"a todo app for remote teams\"");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

runPipeline(idea).catch((err) => {
  console.error("Pipeline failed:", err.message);
  process.exit(1);
});

import Anthropic from "@anthropic-ai/sdk";
import { PipelineState, AgentName, AgentOutput } from "../types/index.js";
import { runResearcher } from "../agents/researcher.js";
import { runPlanner } from "../agents/planner.js";
import { runGenerator } from "../agents/generator.js";
import { runCritic } from "../agents/critic.js";
import { runRefiner } from "../agents/refiner.js";
import { outputExists } from "../utils/fileIO.js";
import { log } from "../utils/logger.js";

const PIPELINE = "Pipeline";

const AGENT_OUTPUT_PATHS: Record<AgentName, string> = {
  Researcher: "outputs/01_research.md",
  Planner: "outputs/02_outline.md",
  Generator: "outputs/03_prd_draft.md",
  Critic: "outputs/04_critique.md",
  Refiner: "outputs/05_final_prd.md",
};

export async function runPipeline(idea: string): Promise<PipelineState> {
  const client = new Anthropic();
  const state: PipelineState = {
    idea,
    startedAt: new Date().toISOString(),
    outputs: {},
    completedAgents: [],
  };

  const agentInput = { idea, previousOutputs: state.outputs };
  const results: AgentOutput[] = [];

  const agents: { name: AgentName; run: () => Promise<AgentOutput> }[] = [
    { name: "Researcher", run: () => runResearcher(client, agentInput) },
    { name: "Planner",    run: () => runPlanner(client, agentInput) },
    { name: "Generator",  run: () => runGenerator(client, agentInput) },
    { name: "Critic",     run: () => runCritic(client, agentInput) },
    { name: "Refiner",    run: () => runRefiner(client, agentInput) },
  ];

  for (const agent of agents) {
    const outputPath = AGENT_OUTPUT_PATHS[agent.name];

    // Resume: skip agents whose output already exists
    if (await outputExists(outputPath)) {
      log(PIPELINE, `Skipping ${agent.name} — output already exists at ${outputPath}`);
      state.completedAgents.push(agent.name);
      continue;
    }

    log(PIPELINE, `━━━ Starting ${agent.name} ━━━`);
    try {
      const result = await agent.run();
      results.push(result);
      state.completedAgents.push(agent.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(PIPELINE, `ERROR in ${agent.name}: ${message}`);
      throw err;
    }
  }

  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  log(PIPELINE, `━━━ Pipeline complete ━━━`);
  log(PIPELINE, `Agents run: ${results.length} | Total time: ${(totalMs / 1000).toFixed(1)}s`);
  log(PIPELINE, `Final PRD: ${AGENT_OUTPUT_PATHS.Refiner}`);

  return state;
}

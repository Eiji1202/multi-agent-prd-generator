import Anthropic from "@anthropic-ai/sdk";
import { PipelineState, AgentName, AgentOutput } from "../types/index";
import { runResearcher } from "../agents/researcher";
import { runPlanner } from "../agents/planner";
import { runGenerator } from "../agents/generator";
import { runCritic } from "../agents/critic";
import { runRefiner } from "../agents/refiner";
import { log } from "../utils/logger";

const PIPELINE = "Pipeline";

export type ProgressEvent =
  | { type: "agent_start"; agent: AgentName }
  | { type: "agent_done"; agent: AgentName; durationMs: number; content: string }
  | { type: "pipeline_done"; totalMs: number }
  | { type: "error"; agent: AgentName; message: string };

export async function runPipeline(
  idea: string,
  onProgress?: (event: ProgressEvent) => void
): Promise<PipelineState> {
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
    log(PIPELINE, `━━━ Starting ${agent.name} ━━━`);
    onProgress?.({ type: "agent_start", agent: agent.name });

    try {
      const result = await agent.run();
      results.push(result);
      state.outputs[agent.name] = result.content;
      state.completedAgents.push(agent.name);
      onProgress?.({ type: "agent_done", agent: agent.name, durationMs: result.durationMs, content: result.content });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(PIPELINE, `ERROR in ${agent.name}: ${message}`);
      onProgress?.({ type: "error", agent: agent.name, message });
      throw err;
    }
  }

  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  log(PIPELINE, `━━━ Pipeline complete ━━━`);
  log(PIPELINE, `Agents run: ${results.length} | Total time: ${(totalMs / 1000).toFixed(1)}s`);
  onProgress?.({ type: "pipeline_done", totalMs });

  return state;
}

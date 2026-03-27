// ─── Base interfaces ──────────────────────────────────────────────────────────

export interface AgentInput {
  idea: string;
  previousOutputs: Partial<Record<AgentName, string>>;
}

export interface AgentOutput {
  agentName: AgentName;
  content: string;
  durationMs: number;
}

// ─── Agent names ──────────────────────────────────────────────────────────────

export type AgentName =
  | "Researcher"
  | "Planner"
  | "Generator"
  | "Critic"
  | "Refiner";

// ─── Per-agent output types ───────────────────────────────────────────────────

export interface ResearchReport {
  problemSpace: string;
  targetUsers: string[];
  existingSolutions: string[];
  marketInsights: string;
  keyRequirements: string[];
}

export interface PrdOutline {
  title: string;
  sections: OutlineSection[];
}

export interface OutlineSection {
  heading: string;
  description: string;
  subsections?: string[];
}

export interface PrdDraft {
  title: string;
  overview: string;
  goals: string[];
  nonGoals: string[];
  userStories: UserStory[];
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: Requirement[];
  successMetrics: string[];
  openQuestions: string[];
}

export interface UserStory {
  role: string;
  action: string;
  benefit: string;
}

export interface Requirement {
  id: string;
  description: string;
  priority: "must" | "should" | "could";
}

export interface CriticFeedback {
  score: number; // 0–10
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  revisedSections: string[];
}

export interface FinalPrd {
  title: string;
  version: string;
  content: string; // full markdown document
}

// ─── Pipeline state ───────────────────────────────────────────────────────────

export interface PipelineState {
  idea: string;
  startedAt: string; // ISO timestamp
  outputs: Partial<Record<AgentName, string>>;
  completedAgents: AgentName[];
}

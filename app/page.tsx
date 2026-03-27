"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ProgressEvent } from "../src/pipeline/orchestrator";

type AgentName = "Researcher" | "Planner" | "Generator" | "Critic" | "Refiner";

const AGENTS: AgentName[] = ["Researcher", "Planner", "Generator", "Critic", "Refiner"];

const AGENT_LABELS: Record<AgentName, string> = {
  Researcher: "市場調査・競合分析",
  Planner: "PRD構成・戦略アウトライン",
  Generator: "PRDドラフト作成",
  Critic: "スコア付き批評（4つの観点）",
  Refiner: "最終PRD仕上げ",
};

type AgentStatus = "pending" | "running" | "done" | "error";

interface AgentState {
  status: AgentStatus;
  durationMs?: number;
  content?: string;
}

type PipelineStatus = "idle" | "running" | "done" | "error";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [agents, setAgents] = useState<Record<AgentName, AgentState>>({
    Researcher: { status: "pending" },
    Planner: { status: "pending" },
    Generator: { status: "pending" },
    Critic: { status: "pending" },
    Refiner: { status: "pending" },
  });
  const [finalPrd, setFinalPrd] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function updateAgent(name: AgentName, patch: Partial<AgentState>) {
    setAgents((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || status === "running") return;

    // Reset
    setStatus("running");
    setFinalPrd(null);
    setErrorMessage(null);
    setAgents({
      Researcher: { status: "pending" },
      Planner: { status: "pending" },
      Generator: { status: "pending" },
      Critic: { status: "pending" },
      Refiner: { status: "pending" },
    });

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("リクエストに失敗しました");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6)) as ProgressEvent;

          if (event.type === "agent_start") {
            updateAgent(event.agent, { status: "running" });
          } else if (event.type === "agent_done") {
            updateAgent(event.agent, { status: "done", durationMs: event.durationMs, content: event.content });
            if (event.agent === "Refiner") setFinalPrd(event.content);
          } else if (event.type === "pipeline_done") {
            setStatus("done");
          } else if (event.type === "error") {
            updateAgent(event.agent, { status: "error" });
            setErrorMessage(event.message);
            setStatus("error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setStatus("idle");
    setIdea("");
    setFinalPrd(null);
    setErrorMessage(null);
    setAgents({
      Researcher: { status: "pending" },
      Planner: { status: "pending" },
      Generator: { status: "pending" },
      Critic: { status: "pending" },
      Refiner: { status: "pending" },
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-10">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">マルチエージェント PRD ジェネレーター</h1>
        <p className="text-gray-400 text-sm">
          5つのAIエージェントがアイデアをプロダクト要件定義書（PRD）に自動変換します。
        </p>
      </div>

      {/* 入力フォーム */}
      {status === "idle" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="例: リモートチーム向けの習慣トラッキングアプリ"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!idea.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            PRDを生成する
          </button>
        </form>
      )}

      {/* パイプライン進捗 */}
      {status !== "idle" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-1">
            <p className="text-xs text-gray-500 mb-3 font-mono">アイデア: &quot;{idea}&quot;</p>
            {AGENTS.map((name) => {
              const agent = agents[name];
              const icon =
                agent.status === "done" ? "✓" :
                agent.status === "running" ? "⟳" :
                agent.status === "error" ? "✗" : "○";
              const color =
                agent.status === "done" ? "text-green-400" :
                agent.status === "running" ? "text-blue-400 animate-pulse" :
                agent.status === "error" ? "text-red-400" : "text-gray-600";

              return (
                <div key={name} className={`flex items-center gap-3 py-1.5 text-sm ${color}`}>
                  <span className="w-4 text-center font-mono">{icon}</span>
                  <span className="font-medium w-24">{name}</span>
                  <span className="text-gray-500 text-xs hidden sm:block">{AGENT_LABELS[name]}</span>
                  {agent.durationMs && (
                    <span className="ml-auto text-xs text-gray-500 font-mono">
                      {(agent.durationMs / 1000).toFixed(1)}秒
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
              エラー: {errorMessage}
            </div>
          )}

          {(status === "done" || status === "error") && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              ← 別のアイデアを試す
            </button>
          )}
        </div>
      )}

      {/* 最終PRD出力 */}
      {finalPrd && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            最終 PRD
          </h2>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{finalPrd}</ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}

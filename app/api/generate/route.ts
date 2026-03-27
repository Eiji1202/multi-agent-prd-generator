import { NextRequest } from "next/server";
import { runPipeline, ProgressEvent } from "../../../src/pipeline/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

function encode(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { idea } = await req.json() as { idea: string };

  if (!idea?.trim()) {
    return new Response("Missing idea", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runPipeline(idea.trim(), (event) => {
          controller.enqueue(new TextEncoder().encode(encode(event)));
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          new TextEncoder().encode(encode({ type: "error", agent: "Researcher", message }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

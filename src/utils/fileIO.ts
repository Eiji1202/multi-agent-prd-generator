import { mkdir, writeFile, readFile, access } from "fs/promises";
import { dirname } from "path";

export interface AgentFileMetadata {
  agentName: string;
  model: string;
  timestamp: string;
}

export async function writeAgentOutput(
  filePath: string,
  metadata: AgentFileMetadata,
  content: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const header = [
    "---",
    `agent: ${metadata.agentName}`,
    `model: ${metadata.model}`,
    `timestamp: ${metadata.timestamp}`,
    "---",
    "",
  ].join("\n");
  await writeFile(filePath, header + content, "utf-8");
}

export async function readAgentOutput(filePath: string): Promise<string> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Agent output not found: ${filePath}. Run the preceding agent first.`);
  }
  return readFile(filePath, "utf-8");
}

export async function outputExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

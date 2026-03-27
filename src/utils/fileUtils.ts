import { mkdir, writeFile, readFile } from "fs/promises";
import { dirname } from "path";

export async function saveOutput(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

export async function loadOutput(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

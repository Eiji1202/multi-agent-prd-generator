export function log(agentName: string, message: string): void {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] [${agentName}] ${message}`);
}

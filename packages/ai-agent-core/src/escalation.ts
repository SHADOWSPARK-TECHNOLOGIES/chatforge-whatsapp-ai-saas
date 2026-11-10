import type { AgentMessage } from './types.js';

/** Build a short human-readable handoff summary from a transcript. */
export function summarize(transcript: AgentMessage[]): string {
  const lastUser = [...transcript].reverse().find((m) => m.role === 'user');
  const tools = [...new Set(transcript.filter((m) => m.role === 'tool' && m.toolName).map((m) => m.toolName))];
  const body = lastUser ? `Customer said: "${lastUser.content.slice(0, 200)}".` : 'No customer text captured.';
  const t = tools.length ? ` Tools tried: ${tools.join(', ')}.` : '';
  return `${body}${t} Could not fully resolve automatically.`;
}

/** Contract rule: escalate after `maxAttempts` unresolved tool rounds. */
export function shouldEscalate(toolRounds: number, maxAttempts: number): boolean {
  return toolRounds >= maxAttempts;
}

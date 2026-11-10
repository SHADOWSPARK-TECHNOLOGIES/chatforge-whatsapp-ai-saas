// Core agent types for the CHATFORGE brain.

export type AgentRole = 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  role: AgentRole;
  content: string;
  toolName?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AgentContext {
  tenantId: string;
  leadKey: string;
  messages: AgentMessage[];
  profile: Record<string, unknown>;
  now: () => Date;
}

export interface ToolDefinition<A extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  description: string;
  keywords?: string[];
  extract?: (message: string) => A;
  parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] };
  execute: (args: A, ctx: AgentContext) => ToolResult | Promise<ToolResult>;
}

export interface LLMAdapter {
  generate(
    messages: AgentMessage[],
    opts: { systemPrompt: string }
  ): Promise<{ content: string; toolCalls?: ToolCall[] }>;
}

export interface AgentConfig {
  systemPrompt: string;
  tools: ToolDefinition[];
  llm?: LLMAdapter;
  maxToolRounds?: number;
}

export interface AgentResult {
  reply: string;
  escalate: boolean;
  summary?: string;
  toolNames: string[];
}

export interface Agent {
  handle(userId: string, message: string): Promise<AgentResult>;
}

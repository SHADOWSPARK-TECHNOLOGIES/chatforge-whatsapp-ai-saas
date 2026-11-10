// @chatforge/ai-agent-core — public API.

export type {
  Agent,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResult,
  LLMAdapter,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from './types.js';

export { createAgent, DEFAULT_MAX_TOOL_ROUNDS } from './orchestrator.js';
export { MockLLM, PIDGIN_INTENT_KEYWORDS } from './MockLLM.js';
export { summarize, shouldEscalate } from './escalation.js';
export { englishPrompt, pidginPrompt, buildSystemPrompt, greetingFor } from './prompts.js';
export type { AgentPromptVars } from './prompts.js';
export { createToolkit } from './tools.js';
export type {
  AgentToolClients,
  CreateLeadData,
  CreateLeadInput,
  EscalationData,
  HistoryData,
  HistoryInput,
  ProductInfoData,
  ProductInfoInput,
  RequestPaymentData,
  RequestPaymentInput,
  ScheduleFollowUpData,
  ScheduleFollowUpInput,
  UpdateLeadStatusData,
  UpdateLeadStatusInput,
} from './tools.js';

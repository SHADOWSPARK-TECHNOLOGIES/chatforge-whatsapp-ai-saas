import type {
  Agent,
  AgentConfig,
  AgentMessage,
  AgentResult,
  ToolDefinition,
} from './types.js';
import { MockLLM } from './MockLLM.js';
import { shouldEscalate, summarize } from './escalation.js';

export const DEFAULT_MAX_TOOL_ROUNDS = 2;

const HUMAN_HANDOFF_RE =
  /(escalate|talk to a human|talk to a person|human agent|speak to someone|real person|customer care|I want to speak to|abeg connect me)/i;

/** Built-in "hand to human" tool so the escalation intent always resolves. */
const escalateTool: ToolDefinition = {
  name: 'escalateToHuman',
  description: 'Hand the conversation to a human; mark the conversation escalated.',
  keywords: ['talk to human', 'human', 'person', 'escalate', 'customer care', 'representative', 'connect me to'],
  extract: () => ({}),
  parameters: { type: 'object', properties: {}, required: [] },
  execute: () => ({ ok: true, data: { escalate: true } }),
};

export function createAgent(config: AgentConfig): Agent {
  const maxRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  const tools: ToolDefinition[] = [escalateTool, ...config.tools];
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const llm = config.llm ?? new MockLLM(tools, { systemPrompt: config.systemPrompt });
  const history: Record<string, AgentMessage[]> = {};
  const profiles: Record<string, Record<string, unknown>> = {};

  return {
    async handle(userId: string, message: string): Promise<AgentResult> {
      const messages: AgentMessage[] = history[userId] ?? [];
      messages.push({ role: 'user', content: message });

      if (HUMAN_HANDOFF_RE.test(message)) {
        const reply = escalationReply();
        messages.push({ role: 'assistant', content: reply });
        return { reply, escalate: true, summary: summarize(messages), toolNames: [] };
      }

      const ctx: Parameters<ToolDefinition['execute']>[1] = {
        tenantId: userId.startsWith('t:') ? userId.slice(2, userId.indexOf(':')) || userId : 'tenant',
        leadKey: userId,
        messages,
        profile: profiles[userId] ?? {},
        now: () => new Date(),
      };

      let toolRounds = 0;
      const toolNames: string[] = [];
      const lean: AgentMessage[] = messages.slice();

      for (let guard = 0; guard < 10; guard++) {
        const res = await llm.generate(lean, { systemPrompt: config.systemPrompt });

        if (res.toolCalls && res.toolCalls.length > 0) {
          toolRounds++;
          const call = res.toolCalls[0];
          const tool = toolMap.get(call.name);
          toolNames.push(call.name);
          if (!tool) {
            lean.push({ role: 'tool', content: `No such tool: ${call.name}`, toolName: call.name });
            continue;
          }
          let result;
          try {
            result = await tool.execute(call.arguments as never, ctx);
          } catch (err) {
            result = { ok: false, error: err instanceof Error ? err.message : 'tool failed' };
          }
          lean.push({ role: 'tool', content: JSON.stringify(result), toolName: call.name });
          profiles[userId] = { ...ctx.profile };

          const willEscalate = (result.data as { escalate?: boolean } | undefined)?.escalate === true;
          if (willEscalate || shouldEscalate(toolRounds, maxRounds)) {
            messages.push({ role: 'assistant', content: escalationReply() });
            return { reply: escalationReply(), escalate: true, summary: summarize(messages), toolNames };
          }
          continue;
        }

        const reply = res.content.trim() || 'Sorry — I didn\u2019t quite get that. Could you rephrase?';
        lean.push({ role: 'assistant', content: reply });
        messages.push({ role: 'assistant', content: reply });
        return { reply, escalate: false, summary: undefined, toolNames };
      }

      messages.push({ role: 'assistant', content: escalationReply() });
      return { reply: escalationReply(), escalate: true, summary: summarize(messages), toolNames };
    },
  };
}

function escalationReply(): string {
  return "No wahala! I've connected you to one of our human team — dem go reply you shortly. Thank you for your patience. 🙏";
}

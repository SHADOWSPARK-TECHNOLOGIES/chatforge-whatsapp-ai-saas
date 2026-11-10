import type { AgentMessage, LLMAdapter, ToolCall, ToolDefinition } from './types.js';
import type { IntentKind } from '@chatforge/shared-types';

export interface MockLLMOptions {
  systemPrompt?: string;
}

/**
 * Rule-based fallback "brain" for CHATFORGE. Same interface as the real LLM.
 * - Last message is a tool result → render it as a friendly reply
 *   (English + Pidgin-aware formatting for quotes, escalation, payment).
 * - Last message is a user message → keyword-match a registered tool.
 */
export class MockLLM implements LLMAdapter {
  constructor(
    private tools: ToolDefinition[],
    private opts: MockLLMOptions = {}
  ) {}

  async generate(messages: AgentMessage[], _opts: { systemPrompt: string }) {
    const last = messages[messages.length - 1];
    if (!last) return { content: this.greeting() };
    if (last.role === 'tool') return { content: this.replyFromTool(last.content) };
    if (last.role === 'assistant') return { content: last.content };

    const match = this.pickTool(last.content);
    if (match) {
      const call: ToolCall = {
        name: match.name,
        arguments: match.extract ? match.extract(last.content) : {},
      };
      return { content: '', toolCalls: [call] };
    }
    return { content: this.fallbackReply() };
  }

  private pickTool(text: string): ToolDefinition | null {
    const lowered = text.toLowerCase();
    let best: ToolDefinition | null = null;
    let bestScore = 0;
    for (const tool of this.tools) {
      const kws = tool.keywords ?? [];
      const score = kws.reduce((acc, kw) => (lowered.includes(kw.toLowerCase()) ? acc + 1 : acc), 0);
      if (score > bestScore) {
        bestScore = score;
        best = tool;
      }
    }
    return bestScore > 0 ? best : null;
  }

  private replyFromTool(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as { ok: boolean; data?: unknown; error?: string };
      if (!parsed.ok) return `Sorry — that didn't work${parsed.error ? `: ${parsed.error}` : ''}. Could you give me a bit more detail?`;
      const d = (parsed.data ?? {}) as Record<string, unknown>;
      if (d.reply) return String(d.reply);
      if (d.escalate === true) return '';
      // quote / product rendered
      if (typeof d.priceNgn === 'number') {
        let s = d.name ? `${d.name}\n` : '';
        s += `Price: ₦${Number(d.priceNgn).toLocaleString('en-NG')}`;
        if (d.link) s += `\nPay securely here: ${d.link}`;
        return s;
      }
      return JSON.stringify(d);
    } catch {
      return 'Sorry, I ran into a small issue — one moment.';
    }
  }

  private greeting(): string {
    return 'Hello! 👋 I\u2019m the sales assistant for this business. Ask me about products, prices, or place an order — I dey here for you.';
  }

  private fallbackReply(): string {
    return 'I can help with product questions, prices, bookings and payment links. Try asking about what you want to buy — or say "talk to a human" any time.';
  }
}

// Pidgin-aware keyword intent rules shared by the worker's intent classifier.
export const PIDGIN_INTENT_KEYWORDS: Record<IntentKind, string[]> = {
  GREETING: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'how far', 'wetin dey', 'how you dey'],
  INQUIRY_PRODUCT: ['what do you sell', 'watin you sell', 'do you have', 'you get', 'available', 'you dey sell', 'catalogue', 'list of product'],
  PRICE_QUOTE: ['how much', 'price', 'cost', 'wetin be the price', 'weda', 'how many naira', 'abeg how much', 'price of'],
  BOOKING_ORDER: ['i want', 'i dey interested', 'abeg book', 'place order', 'i want to buy', 'make i order', 'send to me', 'buy'],
  PAYMENT_REQUEST: ['pay', 'account number', 'transfer', 'send pay', 'make i pay', 'pos', 'payment link'],
  COMPLAINT: ['complaint', 'problem', 'wrong', 'bad', 'unhappy', 'no gree', 'dem no deliver', 'broken', 'defect'],
  HUMAN_ESCALATION: ['talk to human', 'talk to person', 'human agent', 'speak to someone', 'customer care', 'real person', 'connect me to human', 'abeg connect me'],
  FAREWELL: ['bye', 'goodbye', 'later', 'thank you', 'thanks for your help', 'chao'],
  UNKNOWN: [],
};

import type { Plan, Product } from '@chatforge/shared-types';

export interface AgentPromptVars {
  businessName: string;
  businessDescription: string;
  products: Product[];
  tone: 'formal' | 'casual' | 'pidgin-mix';
  pidginEnabled: boolean;
  escalationPhone?: string;
  currency?: string;
}

function renderProducts(products: Product[]): string {
  if (products.length === 0) return 'No products on the catalog yet.';
  return products.map((p) => `- ${p.name}: ${p.description ? `${p.description} ` : ''}₦${p.priceNgn.toLocaleString('en-NG')}${p.inStock ? '' : ' (OUT OF STOCK)'}`).join('\n');
}

/** English system prompt. */
export function englishPrompt(v: AgentPromptVars): string {
  return `You are the WhatsApp AI sales assistant for ${v.businessName}.

Business: ${v.businessDescription}

Catalog:
${renderProducts(v.products)}

Tone: ${v.tone}. Currency: ${v.currency ?? 'NGN (₦)'}. Phones: +234.

Rules:
1. Greet warmly, then identify what the customer needs and suggest matching products from the catalog.
2. Quote exact prices in ₦. If the customer shows buying intent, create/qualify the lead and offer a secure Paystack payment link.
3. If the request is unclear, ask ONE short clarifying question — do not guess.
4. If the customer is angry, has a complaint, or explicitly asks for a human, escalate immediately and reassure them.
5. Never invent products or prices that are not in the catalog. Be honest about stock.
6. Use short, friendly WhatsApp-style messages. Do NOT dump long walls of text.
${v.escalationPhone ? `7. Human support line: ${v.escalationPhone} (only for escalation).` : ''}
`;
}

/** Pidgin system prompt (used when tenant.pidginEnabled). */
export function pidginPrompt(v: AgentPromptVars): string {
  return `You be the WhatsApp AI sales assistant for ${v.businessName}. You dey talk Pidgin English well well.

Business: ${v.businessDescription}

Wetin we get for catalog (Price/Money for Naira):
${renderProducts(v.products)}

Tone: friendly + #{v.tone}. Money: ₦ (NGN).

Rules:
1. First greet the customer well well (e.g. "How far! Na ${v.businessName} — wetin I fit help you?"). Then ask wetin dem need.
2. If dem ask say e dey available, list the correct products + price from catalog. No invent anything.
3. When customer show say dem wan buy, make you qualify am — ask size/qty/location — then offer payment link.
4. If you no understand, ask ONE clear question.
5. If customer vex, complain, or say make you connect them to human — escalate sharp sharp.
6. Keep message short. WhatsApp style. No long grammar.
${v.escalationPhone ? `7. Human support line: ${v.escalationPhone}.` : ''}
`;
}

/** Pick the right prompt (Pidgin or English) by tenant setting. */
export function buildSystemPrompt(v: AgentPromptVars): string {
  return v.pidginEnabled ? pidginPrompt(v) : englishPrompt(v);
}

export function greetingFor(v: AgentPromptVars): string {
  if (v.pidginEnabled) {
    return `How far! 👋 Na ${v.businessName} — wetin I fit help you with? We get ${v.products.length} item${v.products.length === 1 ? '' : 's'} for sale. If you wan know price, just ask.`;
  }
  return `Hello! 👋 Welcome to ${v.businessName}. I can help with product questions, prices and orders. What are you looking for?`;
}

export function planLabel(plan: Plan): string {
  return plan.toLowerCase();
}

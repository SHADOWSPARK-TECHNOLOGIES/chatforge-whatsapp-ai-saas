import { PIDGIN_INTENT_KEYWORDS } from '@chatforge/ai-agent-core';
import type { IntentKind } from '@chatforge/shared-types';

export interface IntentResult {
  intent: IntentKind;
  confidence: number;
  modelUsed: string;
}

const INTENTS: IntentKind[] = ['GREETING', 'INQUIRY_PRODUCT', 'PRICE_QUOTE', 'BOOKING_ORDER', 'PAYMENT_REQUEST', 'COMPLAINT', 'HUMAN_ESCALATION', 'FAREWELL'];

/** Primary keyword classifier (Pidgin-aware). Deterministic, works offline. */
export function classifyIntent(text: string): IntentResult {
  const lowered = text.toLowerCase();
  let best = 'UNKNOWN' as IntentKind;
  let bestHits = 0;

  for (const intent of INTENTS) {
    const kws = PIDGIN_INTENT_KEYWORDS[intent];
    const hits = kws.reduce((n, kw) => (lowered.includes(kw) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = intent;
    }
  }

  const confidence = bestHits > 0 ? Math.min(0.98, 0.5 + bestHits * 0.15) : 0.2;
  return { intent: best, confidence, modelUsed: 'MockLLM' };
}

/** Escape hatch: caller can plug in an LLM-based classifier later. */
export function isEscalation(text: string): boolean {
  return /talk to (a )?human|talk to (a )?person|human agent|speak to (a )?human|customer care|connect me to (a )?human/i.test(text);
}

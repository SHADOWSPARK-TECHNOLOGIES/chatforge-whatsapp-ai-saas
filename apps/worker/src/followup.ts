import { prisma, haveDb } from './db.js';
import type { FollowUpTrigger } from '@chatforge/shared-types';

/**
 * Follow-up scheduling. Phase 3 swaps the pure-Prisma path for BullMQ workers
 * (REDIS_URL) and keeps this as the plan builder + enqueuer.
 */
export async function scheduleForLead(leadId: string, trigger: FollowUpTrigger, tenantId: string) {
  const hours = trigger === 'NEW_LEAD' ? [2, 24, 72] : trigger === 'QUOTE_SENT' ? [24] : trigger === 'PAYMENT_SENT_PENDING_48H' ? [48] : [24];
  const messages = {
    NEW_LEAD: 'Wetin I fit help you? We still get nice styles for you. 🛍️',
    QUOTE_SENT: 'Abeg, you still dey interested for your order? Make I help you finish am. 😊',
    PAYMENT_SENT_PENDING_48H: 'Hello! Your payment link still dey open — no rush, but we dey ready to ship once payment confirm. 🙏',
    NO_REPLY_24H: 'We dey still dey here for you — if you get any question, just reply. 🙂',
  } as Record<FollowUpTrigger, string>;

  if (!haveDb() || !prisma) {
    console.log(`[followup] (mock) would schedule ${trigger} for lead ${leadId} at ${hours.map((h) => `${h}h`).join(', ')}`);
    return { scheduled: hours.length };
  }

  const sendAt = new Date(Date.now() + hours[0] * 3600_000);
  const created = await prisma.scheduledMessage.create({
    data: { tenantId, leadId, sendAt, status: 'PENDING', content: messages[trigger] },
  });
  console.log(`[followup] scheduled ${created.id} at ${sendAt.toISOString()} (${trigger})`);
  return { scheduled: hours.length, firstId: created.id };
}

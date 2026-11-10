import { prisma, dbReady } from './db.js';
import { messageText, type IncomingMessage } from './normalize.js';
import { classifyIntent, isEscalation } from './intent.js';
import { getOrCreateLead, getOrCreateConversation, setLeadStatus, tagHotLead } from './crm.js';
import { getAgentForTenant, loadTenantCtx } from './agent.js';
import { makeAdapter } from './whatsapp/adapter.js';
import { config } from './config.js';

const adapter = makeAdapter();

/**
 * Full chat flow: normalize → persist customer message → agent decides →
 * reply via adapter → persist agent message → escalate when needed.
 * Returns a trace for tests.
 */
export async function processIncoming(msg: IncomingMessage): Promise<Record<string, unknown>> {
  const text = messageText(msg);
  const intent = classifyIntent(text);

  if (!(await dbReady())) {
    // Mock mode: run the agent against the demo tenant context (no DB persistence).
    const ctx = await loadTenantCtx('demo-tenant');
    const agent = getAgentForTenant(ctx);
    const result = await agent.handle(msg.from, text);
    const reply = result.reply;
    await adapter.sendMessage(msg.from, reply);
    if (result.escalate) await adapter.sendMessage(msg.from, 'A human has been notified and will take over shortly. 🙏');
    return { mode: 'mock', from: msg.from, intent: intent.intent, reply, escalate: result.escalate };
  }

  if (!prisma) return { skipped: 'no_db' };

  // Resolve tenant by WhatsApp phone id, else the first demo tenant.
  let tenant = await prisma.tenant.findFirst({ where: { whatsappPhoneId: config.whatsappPhoneNumberId || undefined } });
  if (!tenant) tenant = await prisma.tenant.findFirst();
  if (!tenant) return { skipped: 'no_tenant' };
  const tenantId = tenant.id;

  const lead = await getOrCreateLead(tenantId, msg.from, msg.profileName);
  const conversation = await getOrCreateConversation(tenantId, lead.id);

  const customerMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: 'CUSTOMER', content: text, intent: intent.intent, metadata: { sourceId: msg.id } },
  });
  await prisma.intentLog
    .create({ data: { messageId: customerMessage.id, intent: intent.intent, confidence: intent.confidence, modelUsed: intent.modelUsed } })
    .catch(() => {});

  const ctx = await loadTenantCtx(tenantId);
  const agent = getAgentForTenant(ctx);
  const result = await agent.handle(`${tenantId}:${lead.id}`, text);
  // hot-lead tagging: count product-intent messages in this conversation
  const inquiryCount = await prisma.message.count({
    where: { conversationId: conversation.id, intent: { in: ['INQUIRY_PRODUCT', 'PRICE_QUOTE', 'BOOKING_ORDER'] } },
  });
  await tagHotLead(msg.from, inquiryCount);

  // Persist the agent's reply
  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'AGENT', content: result.reply, metadata: { escalated: result.escalate } },
  });

  // Escalation → mark conversation escalated + move lead to QUALIFIED if buying
  if (result.escalate || isEscalation(text)) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'ESCALATED', aiHandled: false } });
    await adapter.sendMessage(msg.from, 'I go connect you with a human right away — dem go reply you shortly. 🙏');
  } else {
    await adapter.sendMessage(msg.from, result.reply);
    if (/i (dey )?(interested|want)|make I (order|buy|book)|send to me/i.test(text)) {
      await setLeadStatus(tenantId, lead.id, 'QUALIFIED');
    }
  }
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  return { mode: 'db', tenantId, leadId: lead.id, conversationId: conversation.id, intent: intent.intent, reply: result.reply, escalate: result.escalate };
}

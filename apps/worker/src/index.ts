import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { normalizeMetaWebhook, messageText, type IncomingMessage } from './normalize.js';
import { classifyIntent } from './intent.js';
import { makeAdapter } from './whatsapp/adapter.js';
import { prisma, haveDb } from './db.js';

const app: FastifyInstance = Fastify({ logger: true });

// ---- idempotency (dedup) + per-lead rate limiting (in-memory) ----
const seen = new Set<string>();
const rate = new Map<string, number[]>();

function isDuplicate(id: string): boolean {
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 50_000) seen.clear();
  return false;
}

function rateLimited(from: string): boolean {
  const now = Date.now();
  const window = (rate.get(from) ?? []).filter((t) => now - t < config.rateLimitWindowMs);
  // keep first entry to anchor the window
  window.push(now);
  rate.set(from, window.slice(-20));
  return window.length > config.rateLimitPerLead;
}

// ---- handlers ----
async function handleIncoming(msg: IncomingMessage) {
  if (isDuplicate(msg.id)) return { skipped: 'duplicate' };
  if (rateLimited(msg.from)) return { skipped: 'rate_limited' };

  const text = messageText(msg);
  const intent = classifyIntent(text);
  let saved: unknown = { id: msg.id, from: msg.from, intent: intent.intent };

  if (haveDb() && prisma) {
    // tenant lookup by whatsappPhoneNumberId; fall back to demo tenant
    const tenant = await prisma.tenant.findFirst({ where: { whatsappPhoneId: config.whatsappPhoneNumberId || undefined } }).catch(() => null);
    const tenantId = tenant?.id ?? '';

    let lead;
    if (tenantId) {
      lead = await prisma.lead.upsert({
        where: { tenantId_whatsappNumber: { tenantId, whatsappNumber: msg.from } },
        update: { lastContactAt: new Date(), name: msg.profileName },
        create: { tenantId, whatsappNumber: msg.from, name: msg.profileName, source: 'whatsapp', lastContactAt: new Date() },
      });
    }

    let conversation;
    if (tenantId && lead) {
      conversation = await prisma.conversation.upsert({
        where: { leadId: lead.id },
        update: { lastMessageAt: new Date(), status: 'ACTIVE' },
        create: { tenantId, leadId: lead.id, channel: 'whatsapp', aiHandled: true, lastMessageAt: new Date() },
      });
    }

    if (conversation) {
      const message = await prisma.message.create({
        data: { conversationId: conversation.id, role: 'CUSTOMER', content: text, intent: intent.intent, metadata: { sourceId: msg.id } },
      });
      await prisma.intentLog
        .create({ data: { messageId: message.id, intent: intent.intent, confidence: intent.confidence, modelUsed: intent.modelUsed } })
        .catch(() => {});
      saved = { id: message.id, conversationId: conversation.id, from: msg.from, intent: intent.intent, confidence: intent.confidence };
    }
  }

  console.log(`[ingest] ${msg.from} -> ${intent.intent} (${intent.confidence.toFixed(2)}) "${text.slice(0, 40)}"`);
  return saved;
}

// ---- routes ----
app.get('/health', async () => ({ status: 'ok', db: haveDb(), adapter: makeAdapter().name, ts: Date.now() }));

// WhatsApp webhook GET: verify challenge
app.get('/webhook/whatsapp', async (req, reply) => {
  const q = req.query as Record<string, string>;
  if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === config.whatsappVerifyToken) {
    return reply.type('text/plain').send(q['hub.challenge'] || 'OK');
  }
  return reply.code(403).send('VERIFY_FAILED');
});

// WhatsApp webhook POST: receive messages
app.post('/webhook/whatsapp', async (req, reply) => {
  const body = req.body;
  const messages = normalizeMetaWebhook(body);
  const results = [];
  for (const m of messages) {
    results.push(await handleIncoming(m));
  }
  return reply.code(200).send({ status: 'ok', processed: messages.length, results });
});

// Simple text ingest for local/testing (mirrors a WhatsApp text message)
app.post('/ingest', async (req, reply) => {
  const body = req.body as { from?: string; text?: string; id?: string; profileName?: string };
  const msg: IncomingMessage = {
    id: body.id ?? `local_${Date.now()}`,
    from: body.from ?? '+2347000000000',
    profileName: body.profileName,
    timestamp: `${Math.floor(Date.now() / 1000)}`,
    type: 'text',
    text: body.text ?? '',
  };
  const result = await handleIncoming(msg);
  return reply.code(200).send({ ok: true, result });
});

app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`[worker] CHATFORGE worker listening on :${config.port} (adapter=${makeAdapter().name}, db=${haveDb()})`);
});

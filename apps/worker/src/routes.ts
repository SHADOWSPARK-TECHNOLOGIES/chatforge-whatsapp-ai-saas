import type { FastifyInstance } from 'fastify';
import { prisma, dbReady } from './db.js';
import { createPaymentLink } from './payments.js';
import { enqueueFollowUp } from './queue.js';
import { gateConversations, gateBroadcast, sendBroadcast } from './billing.js';
import { makeAdapter } from './whatsapp/adapter.js';
import { config } from './config.js';

export function registerWorkerRoutes(app: FastifyInstance) {
  const adapter = makeAdapter();

  // ---- create a payment request (agent + web both call this) ----
  app.post('/api/payment-request', async (req, reply) => {
    const body = req.body as { tenantId?: string; leadId?: string; amountNgn?: number; description?: string; email?: string };
    if (!body.tenantId || !body.leadId || !body.amountNgn) return reply.code(400).send({ ok: false, reason: 'tenantId, leadId, amountNgn required' });

    const reference = `chf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const linkResp = await createPaymentLink({
      email: body.email || `lead_${body.leadId}@chatforge.local`,
      amountNgn: body.amountNgn,
      reference,
      description: body.description,
    });

    let row;
    if ((await dbReady()) && prisma) {
      row = await prisma.paymentRequest.create({
        data: {
          tenantId: body.tenantId,
          leadId: body.leadId,
          amountNgn: body.amountNgn,
          description: body.description ?? 'Chatforge order',
          paystackLink: linkResp.link,
          reference,
          status: 'PENDING',
        },
      });
    }

    // send the link on WhatsApp + schedule a 48h nudge
    const lead = prisma && (await dbReady()) ? await prisma.lead.findUnique({ where: { id: body.leadId } }) : null;
    if (lead) {
      await adapter.sendMessage(lead.whatsappNumber, `Kindly make payment of ₦${body.amountNgn.toLocaleString('en-NG')} here: ${linkResp.link}`);
    }
    const leadPhone = lead?.whatsappNumber;
    if (leadPhone) enqueueFollowUp(body.leadId, 'PAYMENT_SENT_PENDING_48H', body.tenantId, 48 * 3600_000);

    return reply.code(201).send({ ok: true, link: linkResp.link, reference, id: row?.id });
  });

  // ---- Paystack webhook (charge.success + subscription events) ----
  app.post('/webhook/paystack', async (req, reply) => {
    const body = req.body as { event?: string; data?: { reference?: string; status?: string; subscription_code?: string; amount?: number; plan?: { plan_code?: string } } };
    const event = body.event ?? '';
    const data = body.data ?? {};
    console.log(`[paystack-webhook] event=${event} ref=${data.reference}`);

    if (event === 'charge.success') {
      if (prisma && (await dbReady())) {
        const pr = await prisma.paymentRequest.updateMany({
          where: { reference: data.reference },
          data: { status: 'PAID' },
        });
        if (pr.count > 0) {
          const payment = await prisma.paymentRequest.findFirst({ where: { reference: data.reference } });
          if (payment) {
            const lead = await prisma.lead.findUnique({ where: { id: payment.leadId } });
            if (lead) {
              await prisma.lead.update({ where: { id: lead.id }, data: { status: 'WON', lifetimeValueNgn: { increment: payment.amountNgn } } });
              await adapter.sendMessage(lead.whatsappNumber, '✅ Payment received! Thank you — your order is being prepared. 🎉');
              await enqueueFollowUp(lead.id, 'QUOTE_SENT', payment.tenantId, 0);
            }
          }
        }
      }
      return reply.send({ status: 'ok' });
    }

    if (event === 'subscription.create' || event === 'subscription.enable' || event === 'invoice.payment_success') {
      // upgrade tenant SUB_<code> → best-effort plan switch (mapped in the dashboard)
      if (prisma && (await dbReady())) {
        const plan = data.subscription_code ? 'PRO' : 'PRO';
        await prisma.tenant.updateMany({ where: { paystackCustomerCode: data.subscription_code ?? undefined }, data: { plan: plan as never } });
      }
      return reply.send({ status: 'ok' });
    }

    return reply.send({ status: 'ignored', event });
  });

  // ---- broadcast (created by the dashboard; gated by plan) ----
  app.post('/api/broadcast', async (req, reply) => {
    const body = req.body as { tenantId?: string; name?: string; content?: string; audienceFilter?: Record<string, unknown> };
    if (!body.tenantId || !body.name || !body.content) return reply.code(400).send({ ok: false, reason: 'tenantId, name, content required' });

    const gate = await gateBroadcast(body.tenantId);
    if (!gate.allowed) return reply.code(429).send({ ok: false, reason: `Broadcast limit reached (${gate.limit}/mo on ${gate.plan})` });

    let id: string | null = null;
    if ((await dbReady()) && prisma) {
      const row = await prisma.broadcast.create({
        data: { tenantId: body.tenantId, name: body.name, content: body.content, audienceFilter: (body.audienceFilter ?? {}) as object, status: 'SENDING', stats: { sent: 0, delivered: 0, read: 0, failed: 0 } },
      });
      id = row.id;
    }
    if (id) await sendBroadcast(body.tenantId, id);
    return reply.send({ ok: true, id });
  });

  // ---- gate check helper for the dashboard ----
  app.get('/api/gate', async (req, reply) => {
    const tenantId = String((req.query as Record<string, string>).tenantId || '');
    const conv = await gateConversations(tenantId);
    const bcast = await gateBroadcast(tenantId);
    return reply.send({ conversations: conv, broadcasts: bcast });
  });
}

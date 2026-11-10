// CHATFORGE — demo seed: Ada's Fashion Store (Lagos), products, leads, a full
// Pidgin conversation transcript, a payment request and a follow-up sequence.
//
//   pnpm prisma db push && pnpm prisma db seed
//
// Self-contained (no '@/' alias) so `tsx prisma/seed.ts` runs directly.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ---- Tenant: Ada's Fashion Store ----
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'adas-fashion' },
    update: {},
    create: {
      name: "Ada's Fashion Store",
      slug: 'adas-fashion',
      plan: 'PRO',
      status: 'ACTIVE',
      whatsappPhoneId: 'mock_phone_234',
      whatsappToken: 'MOCK_TOKEN',
      billingEmail: 'ada@adasfashion.com',
      settings: {
        businessDescription: 'Lagos-based fashion boutique selling ankara styles, ready-to-wear and custom fittings across Nigeria.',
        tone: 'pidgin-mix',
        pidginEnabled: true,
        escalationPhone: '+234 803 000 1111',
      },
      // 5 demo products
      products: {
        create: [
          { name: 'Ankara Maxi Dress', description: 'Flowing ankara maxi, hand-sewn.', priceNgn: 18500, category: 'Dresses', inStock: true },
          { name: 'Senator Wear Set', description: 'Two-piece senator set, premium fabric.', priceNgn: 24000, category: 'Wears', inStock: true },
          { name: 'Custom Ojoro Fit', description: 'Tailored shirt — send your measurements.', priceNgn: 12000, category: 'Custom', inStock: true },
          { name: 'Wedding Gele (Turban)', description: 'Ready-to-wear gele styling kit.', priceNgn: 6500, category: 'Accessories', inStock: true },
          { name: 'Leather Loafers (Unisex)', description: 'Genuine leather, sizes 39-45.', priceNgn: 22000, category: 'Shoes', inStock: false },
        ],
      },
    },
  });

  // ---- Tenant user ----
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'ada@adasfashion.com' } },
    update: {},
    create: {
      email: 'ada@adasfashion.com',
      password: 'HASHED_PLACEHOLDER', // replaced by real bcrypt hash on first real password set
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });

  // ---- Leads ----
  const lead1 = await prisma.lead.upsert({
    where: { tenantId_whatsappNumber: { tenantId: tenant.id, whatsappNumber: '+2347030001000' } },
    update: {},
    create: {
      tenantId: tenant.id,
      whatsappNumber: '+2347030001000',
      name: 'Chika Okafor',
      status: 'WON',
      source: 'whatsapp',
      lastContactAt: new Date(),
      lifetimeValueNgn: 18500,
    },
  });
  const lead2 = await prisma.lead.upsert({
    where: { tenantId_whatsappNumber: { tenantId: tenant.id, whatsappNumber: '+2348050002000' } },
    update: {},
    create: {
      tenantId: tenant.id,
      whatsappNumber: '+2348050002000',
      name: 'Bola Ahmed',
      status: 'QUALIFIED',
      source: 'whatsapp',
      lastContactAt: new Date(),
      lifetimeValueNgn: 0,
    },
  });
  const lead3 = await prisma.lead.upsert({
    where: { tenantId_whatsappNumber: { tenantId: tenant.id, whatsappNumber: '+2349090003000' } },
    update: {},
    create: {
      tenantId: tenant.id,
      whatsappNumber: '+2349090003000',
      name: 'Tobi Adeyemi',
      status: 'NEW',
      source: 'whatsapp',
      lastContactAt: new Date(),
      lifetimeValueNgn: 0,
    },
  });

  // ---- Conversation (Pidgin transcript) for Chika ----
  const conv = await prisma.conversation.upsert({
    where: { leadId: lead1.id },
    update: {},
    create: { tenantId: tenant.id, leadId: lead1.id, status: 'ACTIVE', channel: 'whatsapp', aiHandled: true, lastMessageAt: new Date() },
  });

  const transcript: Array<[string, string, string]> = [
    ['CUSTOMER', 'Good afternoon! How far, I dey see some of your styles for Insta. Wetin you get for sale?', 'GREETING'],
    ['AGENT', 'How far! 👋 Na Ada\u2019s Fashion Store — we get ankara dresses, senator wears and custom fittings. Wetin you dey find?', 'GREETING'],
    ['CUSTOMER', 'I like the ankara maxi dress wey you post. How much e be?', 'PRICE_QUOTE'],
    ['AGENT', 'The Ankara Maxi Dress na ₦18,500. Hand-sewn, sizes 8-16. You wan make I reserve one for you?', 'PRICE_QUOTE'],
    ['CUSTOMER', 'Yes o! Make I book am. How I go pay?', 'BOOKING_ORDER'],
    ['AGENT', 'Great! E dey reserved for you. I go send you a secure payment link — you fit pay with card or transfer. 🎉', 'BOOKING_ORDER'],
  ];

  for (const [role, content, intent] of transcript) {
    const msg = await prisma.message.create({
      data: { conversationId: conv.id, role: role as 'CUSTOMER' | 'AGENT', content, intent: intent as 'GREETING' },
    });
    await prisma.intentLog.create({
      data: { messageId: msg.id, intent: intent as 'GREETING', confidence: 0.9, modelUsed: 'MockLLM' },
    });
  }

  // ---- Payment request for Chika ----
  await prisma.paymentRequest.create({
    data: {
      tenantId: tenant.id,
      leadId: lead1.id,
      amountNgn: 18500,
      description: 'Ankara Maxi Dress — #1',
      paystackLink: 'https://paystack.com/pay/mock-adas-fashion-18500',
      reference: 'MOCK_REF_ADO_0001',
      status: 'PAID',
    },
  });

  // ---- Follow-up sequence: NEW_LEAD drip ----
  const seq = await prisma.followUpSequence.create({
    data: {
      tenantId: tenant.id,
      name: 'New Lead Drip',
      triggersOn: 'NEW_LEAD',
      active: true,
      steps: [
        { delayHours: 2, message: 'Wetin I fit help you? We still get nice ankara styles for you. 🛍️' },
        { delayHours: 24, message: 'Abeg make una see our new arrivals — senator wear set dey go fresh. 💃' },
        { delayHours: 72, message: 'Special offer this week! 10% off custom fittings. Dey rush o. ⏳' },
      ],
    },
  });

  await prisma.scheduledMessage.create({
    data: {
      tenantId: tenant.id,
      leadId: lead3.id,
      followUpId: seq.id,
      sendAt: new Date(Date.now() + 2 * 3600_000),
      status: 'PENDING',
      content: 'Wetin I fit help you? We still get nice ankara styles for you. 🛍️',
    },
  });

  // ---- Subscription + audit ----
  const activeSub = await prisma.subscription.findMany({ where: { tenantId: tenant.id } });
  if (activeSub.length === 0) {
    await prisma.subscription.create({
      data: { tenantId: tenant.id, plan: 'PRO', status: 'ACTIVE', paystackSubscriptionCode: 'SUB_MOCK_PRO', renewsAt: new Date(Date.now() + 30 * 86400000) },
    });
  }
  await prisma.auditLog.create({
    data: { tenantId: tenant.id, actor: 'seed', action: 'SEED', metadata: { note: 'demo data' } },
  });

  console.log('[seed] CHATFORGE demo seeded:');
  console.log(`  tenant: Ada's Fashion Store (slug 'adas-fashion', PRO plan)`);
  console.log(`  products: 5 · leads: 3 (${lead1.status}/${lead2.status}/${lead3.status}) · conversation: Pidgin transcript (6 msgs)`);
  console.log(`  payment request: ₦18,500 (PAID) · follow-up sequence: 'New Lead Drip' + 1 scheduled msg`);
  console.log('[seed] Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[seed] Failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

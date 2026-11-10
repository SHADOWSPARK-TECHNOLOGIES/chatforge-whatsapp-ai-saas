import { dbReady, prisma } from './db';
import type { Session } from './session';

// ---- demo snapshot (used when no DB is reachable, so the dashboard always renders) ----
const DEMO = {
  tenant: { id: 'demo-tenant', name: "Ada's Fashion Store", slug: 'adas-fashion', plan: 'PRO', businessDescription: 'Lagos fashion boutique — ankara, senator, custom.', pidginEnabled: true },
  leads: [
    { id: 'l1', whatsappNumber: '+2347030001000', name: 'Chika Okafor', status: 'WON', source: 'whatsapp', lifetimeValueNgn: 18500 },
    { id: 'l2', whatsappNumber: '+2348050002000', name: 'Bola Ahmed', status: 'QUALIFIED', source: 'whatsapp', lifetimeValueNgn: 0 },
    { id: 'l3', whatsappNumber: '+2349090003000', name: 'Tobi Adeyemi', status: 'NEW', source: 'whatsapp', lifetimeValueNgn: 0 },
  ],
  conversations: [
    { id: 'c1', leadName: 'Chika Okafor', whatsappNumber: '+2347030001000', status: 'ACTIVE', aiHandled: true, lastMessageAt: '2m ago' },
    { id: 'c2', leadName: 'Bola Ahmed', whatsappNumber: '+2348050002000', status: 'ESCALATED', aiHandled: false, lastMessageAt: '18m ago' },
    { id: 'c3', leadName: 'Tobi Adeyemi', whatsappNumber: '+2349090003000', status: 'ACTIVE', aiHandled: true, lastMessageAt: '1h ago' },
  ],
  messages: [
    { id: 'm1', role: 'CUSTOMER', content: 'How far! Wetin you get for sale?', intent: 'GREETING', ts: '10:02' },
    { id: 'm2', role: 'AGENT', content: 'How far! 👋 Ankara maxi ₦18,500, senator sets, custom fits. Wetin you dey find?', ts: '10:02' },
    { id: 'm3', role: 'CUSTOMER', content: 'I like the ankara maxi, how much e be?', intent: 'PRICE_QUOTE', ts: '10:04' },
    { id: 'm4', role: 'AGENT', content: 'The Ankara Maxi Dress na ₦18,500 — sizes 8–16. You wan me reserve?', ts: '10:04' },
  ],
  products: [
    { id: 'p1', name: 'Ankara Maxi Dress', description: 'Hand-sewn ankara maxi.', priceNgn: 18500, category: 'Dresses', inStock: true },
    { id: 'p2', name: 'Senator Wear Set', description: 'Two-piece premium set.', priceNgn: 24000, category: 'Wears', inStock: true },
    { id: 'p3', name: 'Custom Ojoro Fit', description: 'Tailored shirt.', priceNgn: 12000, category: 'Custom', inStock: true },
  ],
  analytics: { messagesToday: 42, leadsWon: 8, activeConvos: 12, revenueNgn: 148000, aiResolutionRate: 0.86 },
  broadcasts: [
    { id: 'b1', name: 'New arrivals promo', content: 'New ankara styles just landed! 10% off this week 🛍️', status: 'SENT', stats: { sent: 40, delivered: 38, read: 21, failed: 2 } },
  ],
  invoices: [{ id: 'INV-2026-001', amountNgn: 35000, status: 'paid', issued: '2026-11-01' }],
};

export async function getTenantData(tenantId: string) {
  const tenantIdSafe = tenantId || DEMO.tenant.id;
  if (!(await dbReady()) || !prisma) return { mode: 'demo', tenantId: tenantIdSafe, ...DEMO };

  // TENANT ISOLATION: every query below scopes by tenantIdSafe.
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantIdSafe } });
  if (!tenant) return { mode: 'db', tenantId: tenantIdSafe, ...DEMO };

  const [leads, conversations, products, monthConv, revenue, aiMsgs] = await Promise.all([
    prisma.lead.findMany({ where: { tenantId: tenantIdSafe }, orderBy: { lastContactAt: 'desc' } }),
    prisma.conversation.findMany({
      where: { tenantId: tenantIdSafe },
      orderBy: { lastMessageAt: 'desc' },
      include: { lead: true },
      take: 50,
    }),
    prisma.productService.findMany({ where: { tenantId: tenantIdSafe } }),
    prisma.conversation.count({ where: { tenantId: tenantIdSafe } }),
    prisma.paymentRequest.aggregate({ where: { tenantId: tenantIdSafe, status: 'PAID' }, _sum: { amountNgn: true } }),
    prisma.message.count({ where: { conversation: { tenantId: tenantIdSafe }, role: 'AGENT' } }),
  ]);
  const broadcasts = await prisma.broadcast.findMany({ where: { tenantId: tenantIdSafe }, orderBy: { createdAt: 'desc' } });
  const invoices = await prisma.paymentRequest.findMany({ where: { tenantId: tenantIdSafe, status: 'PAID' }, orderBy: { createdAt: 'desc' }, take: 10 });

  return {
    mode: 'db',
    tenantId: tenantIdSafe,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      businessDescription: (tenant.settings as { businessDescription?: string } | undefined)?.businessDescription ?? '',
      pidginEnabled: (tenant.settings as { pidginEnabled?: boolean } | undefined)?.pidginEnabled ?? false,
    },
    leads,
    conversations: conversations.map((c) => ({
      id: c.id,
      leadName: c.lead?.name ?? c.lead?.whatsappNumber ?? c.leadId,
      whatsappNumber: c.lead?.whatsappNumber ?? '',
      status: c.status,
      aiHandled: c.aiHandled,
      lastMessageAt: c.lastMessageAt ?? c.createdAt,
    })),
    messages: DEMO.messages,
    products: products.map((p) => ({ id: p.id, name: p.name, description: p.description, priceNgn: p.priceNgn, category: p.category, inStock: p.inStock })),
    broadcasts: broadcasts.map((b) => ({ id: b.id, name: b.name, content: b.content, status: b.status, stats: (b.stats as { sent: number; delivered: number; read: number; failed: number }) })),
    invoices: invoices.map((i) => ({ id: i.reference ?? i.id, amountNgn: i.amountNgn, status: 'paid', issued: i.createdAt.toISOString().slice(0, 10) })),
    analytics: {
      messagesToday: await prisma.message.count({ where: { conversation: { tenantId: tenantIdSafe }, timestamp: { gte: new Date(Date.now() - 86400000) } } }),
      leadsWon: leads.filter((l) => l.status === 'WON').length,
      activeConvos: conversations.filter((c) => c.status === 'ACTIVE').length,
      revenueNgn: revenue._sum.amountNgn ?? 0,
      aiResolutionRate: monthConv > 0 ? Math.round((aiMsgs / Math.max(1, monthConv)) * 100) / 100 : 0,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getTenantData>>;
export { DEMO };

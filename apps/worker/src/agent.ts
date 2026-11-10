import { createAgent, createToolkit, MockLLM, buildSystemPrompt, greetingFor, type Agent, type AgentToolClients, type ProductInfoData, type ToolResult } from '@chatforge/ai-agent-core';
import type { TenantSettings, Product } from '@chatforge/shared-types';
import { prisma, dbReady, haveDb } from './db.js';
import { getOrCreateLead, setLeadStatus, listProducts } from './crm.js';
import { createPaymentLink } from './payments.js';
import { scheduleForLead } from './followup.js';

export interface TenantAgentCtx {
  tenantId: string;
  businessName: string;
  settings: TenantSettings;
  products: Product[];
  escalationPhone?: string;
}

const cache = new Map<string, Agent>();

/** Build (and cache) a tenant scoped agent whose tools hit the same DB. */
export function getAgentForTenant(ctx: TenantAgentCtx): Agent {
  const key = ctx.tenantId + ':' + ctx.settings.pidginEnabled;
  if (cache.has(key)) return cache.get(key)!;

  const clients: AgentToolClients = {
    getProductInfo({ query }): ToolResult<ProductInfoData> {
      const q = (query ?? '').toLowerCase();
      const match = (ctx.products.find((p) => p.name.toLowerCase().includes(q)) || ctx.products[0] || null);
      if (!match) return { ok: true, data: { name: '—', priceNgn: 0, inStock: false } };
      return {
        ok: true,
        data: {
          name: match.name,
          priceNgn: match.priceNgn,
          description: match.description,
          inStock: match.inStock,
          category: match.category,
        },
      };
    },
    async createLead({ whatsappNumber, name, source }) {
      const lead = await getOrCreateLead(ctx.tenantId, whatsappNumber ?? 'unknown', name);
      return { ok: true, data: { leadId: lead.id, status: 'NEW' } };
    },
    async updateLeadStatus({ leadId, status }) {
      const st = (['NEW', 'QUALIFIED', 'WON', 'LOST'].includes(status ?? '') ? status : 'QUALIFIED') as 'QUALIFIED';
      return setLeadStatus(ctx.tenantId, leadId ?? '', st);
    },
    async requestPayment({ leadId, amountNgn, description }) {
      const amount = amountNgn ?? ctx.products[0]?.priceNgn ?? 0;
      const reference = `chf_${Date.now()}`;
      const p = await createPaymentLink({ email: `${leadId ?? 'lead'}@chatforge.local`, amountNgn: amount, reference, description: description ?? 'Chatforge order' });
      return { ok: true, data: { link: p.link, reference: p.reference, amountNgn: amount } };
    },
    async scheduleFollowUp({ leadId, trigger }) {
      const t = ((['NEW_LEAD', 'NO_REPLY_24H', 'QUOTE_SENT', 'PAYMENT_SENT_PENDING_48H'].includes(trigger ?? '') ? trigger : 'NEW_LEAD') as 'NEW_LEAD');
      const plan = await scheduleForLead(leadId ?? '', t, ctx.tenantId);
      return { ok: true, data: { scheduled: plan.scheduled, nextInHours: 2 } };
    },
    async getConversationHistory({ limit }) {
      if (!haveDb() || !prisma) return { ok: true, data: { messages: [] } };
      const conv = await prisma.conversation.findFirst({
        where: { tenantId: ctx.tenantId, channel: 'whatsapp' },
        orderBy: { lastMessageAt: 'desc' },
      });
      if (!conv) return { ok: true, data: { messages: [] } };
      const msgs = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { timestamp: 'asc' },
        take: limit ?? 10,
      });
      return { ok: true, data: { messages: msgs.map((m) => `${m.role}: ${m.content}`) } };
    },
  };

  const tools = createToolkit(clients);
  const systemPrompt = buildSystemPrompt({
    businessName: ctx.businessName,
    businessDescription: ctx.settings.businessDescription,
    products: ctx.products,
    tone: ctx.settings.tone ?? 'casual',
    pidginEnabled: ctx.settings.pidginEnabled ?? false,
    escalationPhone: ctx.settings.escalationPhone,
  });

  const agent = createAgent({ systemPrompt, tools, llm: new MockLLM(tools, { systemPrompt }), maxToolRounds: 2 });
  cache.set(key, agent);
  return agent;
}

export async function loadTenantCtx(tenantId: string): Promise<TenantAgentCtx> {
  if (!(await dbReady()) || !prisma) {
    return {
      tenantId: tenantId || 'demo-tenant',
      businessName: "Ada's Fashion Store",
      settings: { businessDescription: 'Lagos fashion boutique — ankara, senator, custom.', tone: 'pidgin-mix', pidginEnabled: true, escalationPhone: '+234 803 000 1111' },
      products: [
        { name: 'Ankara Maxi Dress', description: 'Hand-sewn ankara maxi.', priceNgn: 18500, category: 'Dresses', inStock: true },
        { name: 'Senator Wear Set', description: 'Two-piece senator set, premium fabric.', priceNgn: 24000, category: 'Wears', inStock: true },
        { name: 'Custom Ojoro Fit', description: 'Tailored shirt — send your measurements.', priceNgn: 12000, category: 'Custom', inStock: true },
        { name: 'Wedding Gele (Turban)', description: 'Ready-to-wear gele styling kit.', priceNgn: 6500, category: 'Accessories', inStock: true },
        { name: 'Leather Loafers (Unisex)', description: 'Genuine leather, sizes 39-45.', priceNgn: 22000, category: 'Shoes', inStock: false },
      ],
    };
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  const settings = tenant.settings as unknown as TenantSettings;
  return {
    tenantId: tenant.id,
    businessName: tenant.name,
    settings: { ...settings, pidginEnabled: settings.pidginEnabled ?? false },
    products: await listProducts(tenant.id),
    escalationPhone: settings.escalationPhone,
  };
}

export function greetingForCtx(ctx: TenantAgentCtx): string {
  return greetingFor({ businessName: ctx.businessName, businessDescription: ctx.settings.businessDescription, products: ctx.products, tone: ctx.settings.tone ?? 'casual', pidginEnabled: ctx.settings.pidginEnabled ?? false, escalationPhone: ctx.settings.escalationPhone });
}

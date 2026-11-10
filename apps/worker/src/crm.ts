import { prisma, dbReady } from './db.js';
import type { LeadStatus, Product } from '@chatforge/shared-types';
import type { AgentToolClients, ToolResult } from '@chatforge/ai-agent-core';

const MOCK_PRODUCTS: Product[] = [
  { name: 'Ankara Maxi Dress', description: 'Hand-sewn ankara maxi.', priceNgn: 18500, category: 'Dresses', inStock: true },
  { name: 'Senator Wear Set', description: 'Two-piece senator set, premium fabric.', priceNgn: 24000, category: 'Wears', inStock: true },
  { name: 'Custom Ojoro Fit', description: 'Tailored shirt — send your measurements.', priceNgn: 12000, category: 'Custom', inStock: true },
];

/**
 * CRM logic: create/update leads + conversations, qualify hot leads,
 * move leads along the funnel. DB-gated by the real probe so mock mode works.
 */
export async function getOrCreateLead(tenantId: string, whatsappNumber: string, profileName?: string) {
  if (!(await dbReady()) || !prisma) {
    return { id: `mem_${whatsappNumber}`, tenantId, whatsappNumber };
  }
  return prisma.lead.upsert({
    where: { tenantId_whatsappNumber: { tenantId, whatsappNumber } },
    update: { lastContactAt: new Date(), name: profileName ?? undefined },
    create: { tenantId, whatsappNumber, name: profileName, source: 'whatsapp', lastContactAt: new Date(), status: 'NEW' },
  });
}

export async function getOrCreateConversation(tenantId: string, leadId: string) {
  if (!(await dbReady()) || !prisma) {
    return { id: `mem_conv_${leadId}`, tenantId, leadId };
  }
  return prisma.conversation.upsert({
    where: { leadId },
    update: { lastMessageAt: new Date(), status: 'ACTIVE' },
    create: { tenantId, leadId, channel: 'whatsapp', aiHandled: true, lastMessageAt: new Date() },
  });
}

export async function setLeadStatus(tenantId: string, leadId: string, status: LeadStatus) {
  if (!(await dbReady()) || !prisma) return { ok: true, data: { leadId, status } };
  await prisma.lead.updateMany({ where: { id: leadId, tenantId }, data: { status } });
  return { ok: true, data: { leadId, status } };
}

export async function tagHotLead(whatsappNumber: string, productInquiries: number) {
  if (!(await dbReady()) || !prisma) return;
  if (productInquiries >= 3) {
    await prisma.lead
      .updateMany({
        where: { whatsappNumber },
        data: { customFields: { hot: true } },
      })
      .catch(() => {});
  }
}

export async function listProducts(tenantId: string): Promise<Product[]> {
  if (!(await dbReady()) || !prisma) return MOCK_PRODUCTS;
  const rows = await prisma.productService.findMany({ where: { tenantId } });
  return rows.map((r) => ({ name: r.name, description: r.description, priceNgn: r.priceNgn, category: r.category, inStock: r.inStock }));
}

export type { AgentToolClients, ToolResult };

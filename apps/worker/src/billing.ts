import { config } from './config.js';
import { prisma, dbReady } from './db.js';
import { makeAdapter } from './whatsapp/adapter.js';
import { broadcastQueue, followUpQueue } from './queue.js';

/**
 * Plan & feature gating (₦/mo). FREE ₦0, BASIC ₦15,000, PRO ₦35,000,
 * ENTERPRISE custom. Each action checks the tenant's plan limits.
 */
export interface PlanGate {
  allowed: boolean;
  limit: number;
  used: number;
  plan: string;
}

export const PLAN_QUOTAS = {
  FREE: { conversationsPerMonth: 500, broadcastsPerMonth: 1, followUpsPerLead: 1 },
  BASIC: { conversationsPerMonth: 3000, broadcastsPerMonth: 10, followUpsPerLead: 3 },
  PRO: { conversationsPerMonth: 10000, broadcastsPerMonth: 50, followUpsPerLead: 10 },
  ENTERPRISE: { conversationsPerMonth: 100000, broadcastsPerMonth: 500, followUpsPerLead: 100 },
} as const;

export async function getTenantPlan(tenantId: string): Promise<keyof typeof PLAN_QUOTAS> {
  if (!(await dbReady()) || !prisma) return 'PRO';
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return ((tenant?.plan as string) || 'FREE') as keyof typeof PLAN_QUOTAS;
}

export async function gateConversations(tenantId: string): Promise<PlanGate> {
  const plan = await getTenantPlan(tenantId);
  const quota = PLAN_QUOTAS[plan];
  let used = 0;
  if (prisma && (await dbReady())) {
    const monthStart = new Date();
    monthStart.setDate(1);
    used = await prisma.conversation.count({ where: { tenantId, createdAt: { gte: monthStart } } });
  }
  return { allowed: used < quota.conversationsPerMonth, limit: quota.conversationsPerMonth, used, plan };
}

export async function gateBroadcast(tenantId: string): Promise<PlanGate> {
  const plan = await getTenantPlan(tenantId);
  const quota = PLAN_QUOTAS[plan];
  let used = 0;
  if (prisma && (await dbReady())) {
    const monthStart = new Date();
    monthStart.setDate(1);
    used = await prisma.broadcast.count({ where: { tenantId, createdAt: { gte: monthStart } } });
  }
  return { allowed: used < quota.broadcastsPerMonth, limit: quota.broadcastsPerMonth, used, plan };
}

/** Send a broadcast to matching leads (rate-limited, async via queue). */
export async function sendBroadcast(tenantId: string, broadcastId: string) {
  if (!(await dbReady()) || !prisma) {
    console.log(`[broadcast] (mock) broadcast ${broadcastId} to 0 leads (no DB)`);
    return { sent: 0 };
  }
  const b = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
  if (!b) throw new Error('Broadcast not found');
  const leads = await prisma.lead.findMany({ where: { tenantId } });
  const adapter = makeAdapter();
  let sent = 0;
  const payload = { tenantId, content: b.content, to: leads.map((l) => l.whatsappNumber) };
  if (broadcastQueue) {
    await broadcastQueue.add('send', payload, { attempts: 3 });
  } else {
    // mock: send immediately (no real WhatsApp), update stats
    for (const to of payload.to) {
      const r = await adapter.sendMessage(to, payload.content);
      if (r.ok) sent++;
    }
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'SENT', stats: { sent, delivered: sent, read: 0, failed: leads.length - sent } },
    });
  }
  return { sent };
}

export { followUpQueue };

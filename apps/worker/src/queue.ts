import { Queue, Worker } from 'bullmq';
import { config } from './config.js';
import { prisma, dbReady } from './db.js';
import { makeAdapter, type WhatsAppAdapter } from './whatsapp/adapter.js';
import { scheduleForLead } from './followup.js';

/**
 * Follow-up + broadcast queues. When REDIS_URL is set → BullMQ with a real
 * Redis (Upstash). Otherwise a simple in-memory timer fallback is used so the
 * scheduler still works with zero infra.
 */
const useRedis = !!config.redisUrl;

export const followUpQueue = useRedis
  ? new Queue('followup', { connection: { url: config.redisUrl } })
  : null;
export const broadcastQueue = useRedis ? new Queue('broadcast', { connection: { url: config.redisUrl } }) : null;

const adapter: WhatsAppAdapter = makeAdapter();
const timers = new Set<NodeJS.Timeout>();

export function enqueueFollowUp(leadId: string, trigger: string, tenantId: string, delayMs: number) {
  if (followUpQueue) {
    void followUpQueue.add('send', { leadId, trigger, tenantId }, { delay: delayMs, attempts: 3 });
    return;
  }
  const t = setTimeout(() => {
    void processScheduled({ leadId, tenantId, trigger });
  }, delayMs);
  timers.add(t);
}

export async function processScheduled(job: { leadId: string; tenantId: string; trigger?: string }) {
  if (!(await dbReady()) || !prisma) {
    console.log(`[followup] (mock) follow-up for lead ${job.leadId}`);
    return;
  }
  const lead = await prisma.lead.findUnique({ where: { id: job.leadId } });
  if (!lead) return;
  const pending = await prisma.scheduledMessage.findFirst({ where: { leadId: job.leadId, status: 'PENDING' }, orderBy: { sendAt: 'asc' } });
  if (!pending) return;
  await adapter.sendMessage(lead.whatsappNumber, pending.content);
  await prisma.scheduledMessage.update({ where: { id: pending.id }, data: { status: 'SENT' } });
  // if more steps remain in the sequence, they were pre-enqueued at schedule time
}

export function startWorkers() {
  if (!followUpQueue) return;
  const worker = new Worker('followup', async (job) => processScheduled(job.data as { leadId: string; tenantId: string }), {
    connection: { url: config.redisUrl },
  });
  worker.on('failed', (job, err) => console.error('[followup] job failed:', job?.id, err?.message));
}

export function stopWorkers() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
}

export { scheduleForLead };

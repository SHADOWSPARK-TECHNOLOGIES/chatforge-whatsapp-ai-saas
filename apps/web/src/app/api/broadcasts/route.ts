import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';
import { makeAdapter } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; content?: string; audience?: string; pidgin?: boolean };
  const name = (body.name || '').trim();
  const content = (body.content || '').trim();
  if (!name || !content) return NextResponse.json({ ok: false, reason: 'Name and message required.' }, { status: 400 });

  if (!(await dbReady()) || !prisma) {
    console.log(`[broadcast] (mock) "${name}" → ${body.audience ?? 'all'}:\n${content}`);
    return NextResponse.json({ ok: true, demo: true });
  }

  const leads = await prisma.lead.findMany({
    where: {
      tenantId: session.tenantId,
      ...(body.audience === 'hot' ? { status: { in: ['QUALIFIED', 'WON'] } } : body.audience === 'won' ? { status: 'WON' } : {}),
    },
  });

  const b = await prisma.broadcast.create({
    data: {
      tenantId: session.tenantId,
      name,
      content,
      audienceFilter: { audience: body.audience ?? 'all', pidgin: body.pidgin ?? true },
      status: 'SENDING',
      stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
    },
  });

  // Send via adapter (mock by default). Real Meta/worker wiring is a production swap.
  const adapter = makeAdapter();
  let sent = 0;
  let failed = 0;
  for (const lead of leads) {
    const r = await adapter.sendMessage(lead.whatsappNumber, content);
    if (r.ok) sent++;
    else failed++;
  }
  await prisma.broadcast.update({
    where: { id: b.id },
    data: { status: 'SENT', stats: { sent, delivered: sent, read: 0, failed } },
  });
  await prisma.auditLog.create({ data: { tenantId: session.tenantId, actor: session.userId, action: 'BROADCAST_SENT', metadata: { broadcastId: b.id, recipients: leads.length } } });

  return NextResponse.json({ ok: true, id: b.id, sent });
}

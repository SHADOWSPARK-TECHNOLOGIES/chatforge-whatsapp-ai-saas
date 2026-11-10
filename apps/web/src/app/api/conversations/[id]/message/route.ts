import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';
import { makeAdapter } from '@/lib/whatsapp';

// Human takeover: a staff member sends a real message into an escalated conversation.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ ok: false, reason: 'Message required.' }, { status: 400 });

  if (!(await dbReady()) || !prisma) {
    console.log(`[human] (mock) ${session.email} -> conv ${id}: ${content}`);
    return NextResponse.json({ ok: true, demo: true });
  }

  const conv = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId }, include: { lead: true } });
  if (!conv) return NextResponse.json({ ok: false, reason: 'Conversation not found (or no access).' }, { status: 404 });

  const adapter = makeAdapter();
  if (conv.lead?.whatsappNumber) await adapter.sendMessage(conv.lead.whatsappNumber, content);

  await prisma.message.create({
    data: { conversationId: conv.id, role: 'HUMAN', content, intent: 'HUMAN_ESCALATION', metadata: { by: session.email, sourceId: `staff_${Date.now()}` } },
  });
  await prisma.conversation.update({ where: { id: conv.id }, data: { aiHandled: false, lastMessageAt: new Date() } });

  return NextResponse.json({ ok: true });
}

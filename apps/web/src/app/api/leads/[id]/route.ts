import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { status?: string; note?: string };
  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true, status: body.status });

  const lead = await prisma.lead.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!lead) return NextResponse.json({ ok: false, reason: 'Lead not found (or no access).' }, { status: 404 });

  const allowed = ['NEW', 'QUALIFIED', 'WON', 'LOST'];
  if (body.status && allowed.includes(body.status)) {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: body.status as never } });
  }
  if (body.note) {
    await prisma.auditLog.create({ data: { tenantId: session.tenantId, actor: session.userId, action: 'LEAD_NOTE', metadata: { leadId: lead.id, note: body.note } } });
  }
  return NextResponse.json({ ok: true });
}

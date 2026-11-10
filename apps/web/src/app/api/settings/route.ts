import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';
import type { TenantSettings } from '@chatforge/shared-types';

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<TenantSettings> & { businessDescription?: string; whatsappNumber?: string; model?: string };

  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true });

  const current = (await prisma.tenant.findUnique({ where: { id: session.tenantId } }))?.settings ?? ({} as object);
  const cur = current as TenantSettings;
  const merged = {
    ...(current as object),
    businessDescription: body.businessDescription ?? cur.businessDescription ?? '',
    whatsappNumber: body.whatsappNumber ?? cur.whatsappNumber,
    tone: body.tone ?? cur.tone ?? 'casual',
    pidginEnabled: body.pidginEnabled ?? cur.pidginEnabled ?? true,
    escalationPhone: body.escalationPhone ?? cur.escalationPhone,
    model: body.model ?? cur.model ?? 'mock',
  } as TenantSettings;

  await prisma.tenant.update({ where: { id: session.tenantId }, data: { settings: merged as object } });
  await prisma.auditLog.create({ data: { tenantId: session.tenantId, actor: session.userId, action: 'SETTINGS_UPDATED', metadata: { fields: Object.keys(body) } } });
  return NextResponse.json({ ok: true });
}

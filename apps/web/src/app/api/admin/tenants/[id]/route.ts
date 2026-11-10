import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ ok: false, reason: 'Admin only.' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  if (!body.plan || !['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].includes(body.plan)) {
    return NextResponse.json({ ok: false, reason: 'Invalid plan.' }, { status: 400 });
  }
  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true });
  await prisma.tenant.update({ where: { id }, data: { plan: body.plan as never } });
  await prisma.auditLog.create({ data: { tenantId: id, actor: admin.userId, action: 'ADMIN_PLAN_OVERRIDE', metadata: { plan: body.plan } } });
  return NextResponse.json({ ok: true });
}

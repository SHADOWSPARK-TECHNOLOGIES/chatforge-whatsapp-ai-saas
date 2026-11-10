import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true });
  await prisma.productService.deleteMany({ where: { id, tenantId: session.tenantId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { inStock?: boolean };
  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true });
  await prisma.productService.updateMany({ where: { id, tenantId: session.tenantId }, data: { inStock: body.inStock ?? undefined } });
  return NextResponse.json({ ok: true });
}

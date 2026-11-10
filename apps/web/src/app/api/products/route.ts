import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; description?: string; priceNgn?: number; category?: string; inStock?: boolean };
  if (!body.name || !body.priceNgn) return NextResponse.json({ ok: false, reason: 'Name and price required.' }, { status: 400 });
  if (!(await dbReady()) || !prisma) return NextResponse.json({ ok: true, demo: true });

  const p = await prisma.productService.create({
    data: { tenantId: session.tenantId, name: body.name, description: body.description ?? '', priceNgn: body.priceNgn, category: body.category ?? 'General', inStock: body.inStock ?? true },
  });
  return NextResponse.json({ ok: true, id: p.id });
}

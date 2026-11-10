import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';
import type { TenantSettings } from '@chatforge/shared-types';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    businessDescription?: string;
    whatsappNumber?: string;
    tone?: 'formal' | 'casual' | 'pidgin-mix';
    pidginEnabled?: boolean;
    escalationPhone?: string;
    products?: Array<{ name: string; description: string; priceNgn: number; category: string; inStock: boolean }>;
  };
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: 'Not signed in.' }, { status: 401 });
  const tenantId = session.tenantId;

  if (!(await dbReady()) || !prisma) {
    return NextResponse.json({ ok: true, demo: true, redirect: '/dashboard' });
  }

  const settings = (await prisma.tenant.findUnique({ where: { id: tenantId } }))?.settings ?? {};
  const st = settings as unknown as TenantSettings;
  const merged: TenantSettings = {
    ...st,
    businessDescription: body.businessDescription ?? st.businessDescription ?? '',
    whatsappNumber: body.whatsappNumber ?? st.whatsappNumber,
    tone: body.tone ?? st.tone ?? 'casual',
    pidginEnabled: body.pidginEnabled ?? st.pidginEnabled ?? true,
    escalationPhone: body.escalationPhone ?? st.escalationPhone,
  };

  await prisma.tenant.update({ where: { id: tenantId }, data: { settings: merged as object, status: 'ACTIVE' } });

  if (body.products && body.products.length > 0) {
    for (const p of body.products) {
      await prisma.productService.create({ data: { tenantId, name: p.name, description: p.description, priceNgn: p.priceNgn, category: p.category, inStock: p.inStock } });
    }
  }

  return NextResponse.json({ ok: true, redirect: '/dashboard' });
}

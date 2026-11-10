import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; businessName?: string };
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const businessName = (body.businessName || 'My Business').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return NextResponse.json({ ok: false, reason: 'Valid email + password (min 6 chars) required.' }, { status: 400 });
  }

  if (!(await dbReady()) || !prisma) {
    // Demo mode: return a demo session so the whole flow still works locally.
    await createSession({ userId: 'demo-user', tenantId: 'demo-tenant', email: email || 'ada@adasfashion.com', role: 'OWNER' });
    return NextResponse.json({ ok: true, demo: true, redirect: '/onboarding' });
  }

  const existing = await prisma.tenantUser.findFirst({ where: { email } });
  if (existing) return NextResponse.json({ ok: false, reason: 'An account with that email already exists.' }, { status: 409 });

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'tenant';
  const tenant = await prisma.tenant.create({
    data: {
      name: businessName,
      slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
      plan: 'FREE',
      status: 'TRIAL',
      settings: { businessDescription: '', tone: 'casual', pidginEnabled: true },
    },
  });
  const user = await prisma.tenantUser.create({
    data: { email, password: hashPassword(password), role: 'OWNER', tenantId: tenant.id },
  });
  await createSession({ userId: user.id, tenantId: tenant.id, email, role: 'OWNER' });
  return NextResponse.json({ ok: true, redirect: '/onboarding' });
}

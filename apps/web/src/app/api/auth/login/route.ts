import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!(await dbReady()) || !prisma) {
    await createSession({ userId: 'demo-user', tenantId: 'demo-tenant', email: email || 'ada@adasfashion.com', role: 'OWNER' });
    return NextResponse.json({ ok: true, demo: true, redirect: '/dashboard' });
  }

  const user = await prisma.tenantUser.findFirst({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, reason: 'Invalid email or password.' }, { status: 401 });
  if (!verifyPassword(password, user.password)) return NextResponse.json({ ok: false, reason: 'Invalid email or password.' }, { status: 401 });

  await createSession({ userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
  return NextResponse.json({ ok: true, redirect: '/dashboard' });
}

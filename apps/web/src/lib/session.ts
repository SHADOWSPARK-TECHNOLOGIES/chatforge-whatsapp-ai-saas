import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

export interface Session {
  userId: string;
  tenantId: string;
  email: string;
  role: 'OWNER' | 'STAFF' | 'ADMIN';
}

const COOKIE = 'cf_session';
const SECRET = process.env.CHATFORGE_SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'dev_insecure_change_me';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function verify(payload: string, sig: string): boolean {
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function createSession(s: Session): Promise<void> {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(s)).toString('base64url');
  store.set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!verify(payload, sig)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
  } catch {
    return null;
  }
}

export async function requireTenant(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHENTICATED');
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== 'ADMIN') throw new Error('UNAUTHORIZED_ADMIN');
  return s;
}

// Demo-mode session: lets the whole dashboard render without a real signup/DB.
export function demoSession(): Session {
  return { userId: 'demo-user', tenantId: 'demo-tenant', email: 'ada@adasfashion.com', role: 'OWNER' };
}

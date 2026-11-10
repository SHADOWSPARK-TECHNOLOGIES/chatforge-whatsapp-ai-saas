import { PrismaClient } from '@prisma/client';

// Shared Prisma client. We never crash at import: DB gating is decided by an
// explicit async probe (dbReady) so mock-mode works with no Postgres.
let client: PrismaClient | null = null;
try {
  client = new PrismaClient();
} catch {
  client = null;
}

export const prisma = client;
export function haveDb(): boolean {
  return !!prisma;
}

let ready = false;
let lastProbe = 0;
let probing: Promise<boolean> | null = null;

/**
 * True once the database answers a real query. Caches for 2s so hot paths
 * don't hammer a down DB; falls back to false (mock mode) when unreachable.
 */
export async function dbReady(): Promise<boolean> {
  if (!prisma) return false;
  if (ready) return true;
  if (probing) return probing;
  if (Date.now() - lastProbe < 2000) return ready;

  lastProbe = Date.now();
  probing = (async () => {
    try {
      await prisma!.$queryRaw`SELECT 1`;
      ready = true;
    } catch {
      ready = false;
    }
    probing = null;
    return ready;
  })();
  return probing;
}

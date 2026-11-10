import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the worker. Lazy-connect: the worker still
// boots (health + mock paths) when DATABASE_URL is missing by surfacing an
// explicit state instead of crashing at import time.
function makeClient(): PrismaClient | null {
  try {
    const client = new PrismaClient();
    void client.$connect().catch(() => {
      // no DB available — mock mode. Log once, keep process alive.
      if (typeof console !== 'undefined') {
        console.warn('[db] DATABASE_URL not reachable — running without persistence.');
      }
    });
    return client;
  } catch {
    return null;
  }
}

export const prisma = makeClient();
export function haveDb(): boolean {
  return !!prisma;
}

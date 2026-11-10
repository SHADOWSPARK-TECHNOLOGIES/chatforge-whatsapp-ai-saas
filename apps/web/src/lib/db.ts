import { PrismaClient } from '@prisma/client';

let client: PrismaClient | null = null;
try {
  client = new PrismaClient();
} catch {
  client = null;
}
export const prisma = client;

let ready = false;
let lastProbe = 0;
export async function dbReady(): Promise<boolean> {
  if (!prisma) return false;
  if (ready) return true;
  if (Date.now() - lastProbe < 3000) return ready;
  lastProbe = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    ready = true;
  } catch {
    ready = false;
  }
  return ready;
}

/** Demo tenant slug used when no DB is reachable (demo mode for the dashboard). */
export const DEMO_TENANT_SLUG = 'adas-fashion';

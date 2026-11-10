import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card, Th, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/session';
import { prisma, dbReady } from '@/lib/db';
import { PlanSelect } from '@/components/plan-select';

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
  await requireAdmin().catch(() => null); // non-admins get the shell + empty + note
  const isAdmin = !!(await requireAdmin().catch(() => null));
  let tenants: Array<{ id: string; name: string; slug: string; plan: string; status: string; users: number }> = [
    { id: 'demo-tenant', name: "Ada's Fashion Store", slug: 'adas-fashion', plan: 'PRO', status: 'ACTIVE', users: 1 },
  ];
  const canWrite = await dbReady();
  if (canWrite && prisma) {
    tenants = await prisma.tenant.findMany({ take: 200, include: { _count: { select: { users: true } } } }).then((t) =>
      t.map((x) => ({ id: x.id, name: x.name, slug: x.slug, plan: x.plan as string, status: x.status as string, users: x._count.users }))
    );
  }

  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Admin · Tenants</h1>
      {!isAdmin && <p className="mt-1 text-sm text-magenta">You don&apos;t have admin access — this view is read/sandbox only.</p>}
      <Card>
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr><Th>Tenant</Th><Th>Slug</Th><Th>Status</Th><Th>Plan</Th><Th>Users</Th><Th>Override plan</Th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tenants.map((t) => (
              <tr key={t.id}>
                <Td>{t.name}</Td>
                <Td className="font-mono text-xs">{t.slug}</Td>
                <Td><Badge tone={t.status === 'ACTIVE' ? 'green' : 'dim'}>{t.status}</Badge></Td>
                <Td><Badge tone="purple">{t.plan}</Badge></Td>
                <Td>{t.users}</Td>
                <Td><PlanSelect tenantId={t.id} plan={t.plan} disabled={!canWrite} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}

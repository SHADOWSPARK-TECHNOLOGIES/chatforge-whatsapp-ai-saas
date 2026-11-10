import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card, Th, Td } from '@/components/ui';
import { LeadStatusCell } from '@/components/lead-status-cell';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';
import { dbReady } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const canWrite = await dbReady();
  const total = (data as any).leads.length;
  const won = (data as any).leads.filter((l: any) => l.status === 'WON').length;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Leads · {total} <span className="text-sm text-dim">({won} won)</span></h1>
      </div>
      <Card>
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr><Th>Name</Th><Th>Phone</Th><Th>Source</Th><Th>Status</Th><Th>LTV</Th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data as any).leads.map((l: any) => (
              <tr key={l.id}>
                <Td>{l.name ?? '—'}</Td>
                <Td className="font-mono text-xs">{l.whatsappNumber}</Td>
                <Td><Badge tone="dim">{l.source}</Badge></Td>
                <Td><LeadStatusCell leadId={l.id} status={l.status} ltv={l.lifetimeValueNgn ?? 0} load={!canWrite} /></Td>
                <Td className="font-mono">₦{(l.lifetimeValueNgn ?? 0).toLocaleString('en-NG')}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}

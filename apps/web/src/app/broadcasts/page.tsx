import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card, Th, Td } from '@/components/ui';
import { BroadcastComposer } from '@/components/broadcast-composer';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const stats = (b: any) => (b.stats && b.stats.sent !== undefined ? `${b.stats.delivered}/${b.stats.sent} delivered` : '—');
  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Broadcasts</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <BroadcastComposer />
        <Card title="Past broadcasts">
          {(data as any).broadcasts.length === 0 ? (
            <p className="text-sm text-dim">No broadcasts yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {(data as any).broadcasts.map((b: any) => (
                <div key={b.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={b.status === 'SENT' ? 'green' : 'amber'}>{b.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">{b.content}</p>
                  <div className="mt-1 text-[11px] text-dim">{stats(b)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

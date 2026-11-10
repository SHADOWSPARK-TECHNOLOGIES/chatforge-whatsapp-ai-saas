import { DashboardShell } from '@/components/dashboard-shell';
import { Card, Badge } from '@/components/ui';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const INTENTS = [
  ['GREETING', 38],
  ['INQUIRY_PRODUCT', 27],
  ['PRICE_QUOTE', 18],
  ['BOOKING_ORDER', 9],
  ['HUMAN_ESCALATION', 5],
  ['PAYMENT_REQUEST', 3],
] as const;

export default async function AnalyticsPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const a = data.analytics;
  const max = Math.max(...INTENTS.map(([, v]) => v));
  const funnel = [
    ['New leads', data.leads.length],
    ['Qualified', data.leads.filter((l) => l.status === 'QUALIFIED').length],
    ['Won', data.leads.filter((l) => l.status === 'WON').length],
  ] as const;
  const fm = Math.max(...funnel.map(([, v]) => v));

  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Analytics</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Intent distribution (today)">
          <div className="space-y-2">
            {INTENTS.map(([label, v]) => (
              <div key={label}>
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-muted">{label}</span>
                  <span className="text-ink">{v}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
                  <div className="h-full bg-cyan" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Lead funnel">
          <div className="space-y-2">
            {funnel.map(([label, v]) => (
              <div key={label}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono text-ink">{v}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
                  <div className="h-full bg-purple" style={{ width: `${(v / fm) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="AI vs human resolution">
          <div className="flex h-40 items-end justify-center gap-6">
            <div className="text-center">
              <div className="mx-auto w-16 rounded-t-lg bg-cyan" style={{ height: `${Math.round(a.aiResolutionRate * 100)}px` }} />
              <div className="mt-2 font-mono text-sm text-ink">{Math.round(a.aiResolutionRate * 100)}%</div>
              <div className="text-xs text-muted">AI-resolved</div>
            </div>
            <div className="text-center">
              <div className="mx-auto w-16 rounded-t-lg bg-magenta" style={{ height: `${Math.round((1 - a.aiResolutionRate) * 100)}px` }} />
              <div className="mt-2 font-mono text-sm text-ink">{Math.round((1 - a.aiResolutionRate) * 100)}%</div>
              <div className="text-xs text-muted">Human-escalated</div>
            </div>
          </div>
        </Card>
        <Card title="Key metrics">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><Badge tone="cyan">Today msgs</Badge><div className="mt-1 font-mono text-2xl text-ink">{a.messagesToday}</div></div>
            <div><Badge tone="green">Revenue</Badge><div className="mt-1 font-mono text-2xl text-ink">₦{a.revenueNgn.toLocaleString('en-NG')}</div></div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

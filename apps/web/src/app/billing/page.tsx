import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card, Th, Td } from '@/components/ui';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const QUOTAS: Record<string, { c: number; b: number }> = {
  FREE: { c: 500, b: 1 },
  BASIC: { c: 3000, b: 10 },
  PRO: { c: 10000, b: 50 },
  ENTERPRISE: { c: 100000, b: 500 },
};
const PRICE: Record<string, number> = { FREE: 0, BASIC: 15000, PRO: 35000, ENTERPRISE: 0 };

export default async function BillingPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const plan = data.tenant.plan as string;
  const q = QUOTAS[plan] ?? QUOTAS.FREE;
  const convUsed = data.conversations?.length ?? 0;
  const bUsed = data.broadcasts?.length ?? 0;

  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Billing</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title={`Current plan — ${plan}`}>
          <div className="font-mono text-3xl font-bold text-ink">₦{PRICE[plan]?.toLocaleString('en-NG') || 'Custom'}<span className="text-sm text-muted"> /mo</span></div>
          <div className="mt-4 space-y-3">
            <Gauge label="Conversations / month" used={convUsed} limit={q.c} />
            <Gauge label="Broadcasts / month" used={bUsed} limit={q.b} />
          </div>
        </Card>
        <Card title="Upgrade">
          <div className="space-y-2">
            {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((p) => {
              const current = p === plan;
              return (
                <div key={p} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                  <div>
                    <div className="font-semibold text-ink">{p}</div>
                    <div className="text-xs text-muted">₦{PRICE[p].toLocaleString('en-NG')}/mo · {QUOTAS[p].c.toLocaleString('en-NG')} conv · {QUOTAS[p].b} broadcasts</div>
                  </div>
                  {current ? (
                    <Badge tone="green">CURRENT</Badge>
                  ) : (
                    <a href={p === 'ENTERPRISE' ? 'mailto:chatforge@shadowspark.tech' : `https://paystack.com/pay/mock-plan-${p}`} className="rounded-lg bg-cyan px-3 py-1.5 text-sm font-semibold text-bg">
                      Choose
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {data.invoices.length > 0 && <p className="mt-4 text-xs text-dim">Payments are confirmed via the Paystack webhook (mock links in demo mode).</p>}
        </Card>
      </div>
      <Card title="Invoice history" action={<span className="text-xs text-dim">shown when a DB is connected</span>}>
        {data.invoices.length === 0 ? (
          <p className="text-sm text-dim">No invoices yet.</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-white/10"><tr><Th>Invoice</Th><Th>Amount</Th><Th>Status</Th><Th>Issued</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {data.invoices.map((i: any) => (
                <tr key={i.id}>
                  <Td>{i.id}</Td>
                  <Td className="font-mono">₦{i.amountNgn?.toLocaleString?.('en-NG') ?? i.amountNgn}</Td>
                  <Td><Badge tone="green">{i.status}</Badge></Td>
                  <Td className="text-xs text-dim">{i.issued}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </DashboardShell>
  );
}

function Gauge({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted">{label}</span><span className="font-mono text-ink">{used}/{limit}</span></div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
        <div className={`h-full ${pct >= 90 ? 'bg-magenta' : 'bg-cyan'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

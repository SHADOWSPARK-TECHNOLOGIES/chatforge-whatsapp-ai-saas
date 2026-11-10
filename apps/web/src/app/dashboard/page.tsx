import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard-shell';
import { Card, Stat, Badge } from '@/components/ui';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const a = data.analytics;
  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Overview</h1>
      <p className="mt-0.5 text-sm text-muted">{data.mode === 'demo' ? 'Demo data (no DB connected).' : `${data.tenant.name}`} · plan <Badge tone="purple">{data.tenant.plan}</Badge></p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's messages" value={a.messagesToday} />
        <Stat label="Leads won" value={a.leadsWon} />
        <Stat label="Active conversations" value={a.activeConvos} />
        <Stat label="Revenue" value={`₦${a.revenueNgn.toLocaleString('en-NG')}`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="AI resolution rate">
          <div className="font-mono text-3xl font-bold text-cyan">{Math.round(a.aiResolutionRate * 100)}%</div>
          <p className="mt-1 text-sm text-muted">Share of conversations the AI handled to a close without a human.</p>
        </Card>
        <Card title="Quick actions">
          <div className="grid gap-2">
            <Link href="/conversations" className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-cyan hover:text-cyan">Open conversations</Link>
            <Link href="/broadcasts" className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-cyan hover:text-cyan">Send a broadcast</Link>
            <Link href="/settings" className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-cyan hover:text-cyan">Edit products &amp; AI voice</Link>
          </div>
        </Card>
      </div>

      <Card title="Recent conversations" action={<Link href="/conversations" className="text-xs text-cyan">View all</Link>}>
        <div className="divide-y divide-white/5">
          {data.conversations.slice(0, 5).map((c: any) => (
            <Link key={c.id} href={`/conversations/${c.id}`} className="flex items-center justify-between py-2.5 hover:text-cyan">
              <div>
                <div className="text-sm text-ink">{c.leadName}</div>
                <div className="font-mono text-xs text-dim">{c.whatsappNumber}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {!c.aiHandled && <Badge tone="magenta">HUMAN</Badge>}
                <span>{c.lastMessageAt?.toISOString?.()?.slice(0, 16)?.replace('T', ' ') ?? c.lastMessageAt?.toString?.() ?? ''}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}

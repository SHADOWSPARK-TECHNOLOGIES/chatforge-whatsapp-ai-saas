import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card } from '@/components/ui';
import { HumanReplyBox } from '@/components/human-reply-box';
import { getTenantData, DEMO } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conversation' };

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  const tenantId = s?.tenantId ?? 'demo-tenant';
  const data = await getTenantData(tenantId);
  const conv = (data as any).conversations.find((c: any) => c.id === id);

  return (
    <DashboardShell>
      <Link href="/conversations" className="text-sm text-cyan">← Conversations</Link>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink">{conv?.leadName ?? id}</h1>
        <Badge tone="dim">{conv?.whatsappNumber}</Badge>
      </div>

      <Card title="Transcript">
        <div className="space-y-3">
          {DEMO.messages.slice(0, 6).map((m: any) => (
            <div key={m.id} className={`max-w-md rounded-xl px-3 py-2 text-sm ${m.role === 'AGENT' ? 'ml-auto bg-cyan/10 text-cyan' : 'bg-white/5 text-ink'}`}>
              {m.content}
              <div className="mt-0.5 text-right font-mono text-[10px] text-dim">{m.ts}</div>
            </div>
          ))}
        </div>
        <HumanReplyBox conversationId={id} />
      </Card>
    </DashboardShell>
  );
}

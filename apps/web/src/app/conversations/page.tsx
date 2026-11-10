import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard-shell';
import { Badge, Card, Th, Td } from '@/components/ui';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'cyan' | 'purple' | 'magenta' | 'green' | 'dim'> = {
  ACTIVE: 'green',
  ESCALATED: 'magenta',
  CLOSED: 'dim',
  NEW: 'cyan',
  QUALIFIED: 'purple',
  WON: 'green',
  LOST: 'dim',
};
const tone = (s: string) => STATUS_TONE[s] ?? 'dim';

export default async function ConversationsPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Conversations</h1>
      <Card>
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr>
              <Th>Lead</Th>
              <Th>Status</Th>
              <Th>Last message</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.conversations.map((c: any) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/conversations/${c.id}`} className="hover:text-cyan">{c.leadName}</Link>
                  <div className="font-mono text-xs text-dim">{c.whatsappNumber}</div>
                </Td>
                <Td><Badge tone={tone(c.status)}>{c.status}</Badge>{!c.aiHandled && <span className="ml-1 text-[10px] text-magenta">HUMAN</span>}</Td>
                <Td className="text-xs text-dim">{c.lastMessageAt?.toISOString?.()?.slice(0, 16)?.replace('T', ' ') ?? c.lastMessageAt?.toString?.() ?? ''}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}

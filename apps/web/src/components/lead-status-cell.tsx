'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

const STATUSES = ['NEW', 'QUALIFIED', 'WON', 'LOST'];

export function LeadStatusCell({ leadId, status, ltv, load }: { leadId: string; status: string; ltv: number; load: boolean }) {
  const router = useRouter();
  const [local, setLocal] = React.useState(status);
  const [busy, setBusy] = React.useState(false);

  const change = async (next: string) => {
    if (next === local) return;
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
    const j = await res.json();
    if (j.ok) {
      setLocal(next);
      router.refresh();
    }
    setBusy(false);
  };

  return (
    <select
      value={local}
      disabled={busy || load}
      onChange={(e) => change(e.target.value)}
      className={`rounded-lg border bg-surface/70 px-2 py-1 font-mono text-xs outline-none focus:border-cyan ${local === 'WON' ? 'text-green' : local === 'LOST' ? 'text-magenta' : local === 'QUALIFIED' ? 'text-purple' : 'text-cyan'}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="text-ink">{s}</option>
      ))}
    </select>
  );
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

export function PlanSelect({ tenantId, plan, disabled }: { tenantId: string; plan: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const change = async (next: string) => {
    setBusy(true);
    await fetch(`/api/admin/tenants/${tenantId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: next }) });
    setBusy(false);
    router.refresh();
  };
  return (
    <select value={plan} onChange={(e) => change(e.target.value)} disabled={busy || disabled} className="rounded-lg border border-line bg-surface/70 px-2 py-1 font-mono text-xs text-ink outline-none focus:border-purple">
      {PLANS.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

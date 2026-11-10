'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

type Row = { id: string; name: string; description: string; priceNgn: number; category: string; inStock: boolean };

export function ProductsManager({ products, load }: { products: Row[]; load: boolean }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: '', description: '', priceNgn: 0, category: 'Dresses', inStock: true });
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const input = 'h-10 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan';

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.priceNgn <= 0) return setErr('Name and a price (₦) are required.');
    setBusy(true);
    setErr('');
    const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!j.ok) setErr(j.reason || 'Could not add.');
    else setForm({ name: '', description: '', priceNgn: 0, category: 'Dresses', inStock: true });
    setBusy(false);
    router.refresh();
  };

  const del = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    router.refresh();
  };
  const toggle = async (id: string, inStock: boolean) => {
    await fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock: !inStock }) });
    router.refresh();
  };

  return (
    <div>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-5">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${input} sm:col-span-2`} placeholder="Name" disabled={load} />
        <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={input} placeholder="Description" disabled={load} />
        <input type="number" value={form.priceNgn || ''} onChange={(e) => setForm((f) => ({ ...f, priceNgn: Number(e.target.value) }))} className={input} placeholder="₦ price" disabled={load} />
        <button type="submit" disabled={busy || load} className="h-10 rounded-lg bg-cyan px-3 font-semibold text-bg disabled:opacity-50">+ Add</button>
      </form>
      {err && <p className="mt-2 text-sm text-magenta">{err}</p>}

      <div className="mt-4 divide-y divide-white/5">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-sm text-ink">
                {p.name} <span className="font-mono text-cyan">₦{p.priceNgn.toLocaleString('en-NG')}</span>
              </div>
              <div className="text-xs text-dim">{p.description} · {p.category}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-muted">
                <input type="checkbox" checked={p.inStock} onChange={() => toggle(p.id, p.inStock)} className="accent-cyan" disabled={load} />
                in stock
              </label>
              <button onClick={() => del(p.id)} className="text-xs text-magenta" disabled={load}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

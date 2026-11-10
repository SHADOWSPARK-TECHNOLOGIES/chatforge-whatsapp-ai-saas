'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function AIConfigForm({
  initial,
  load,
}: {
  initial: { businessDescription: string; whatsappNumber?: string; tone: string; pidginEnabled: boolean; escalationPhone?: string; model: string };
  load: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = 'h-10 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await res.json();
    if (j.ok) setSaved(true);
    setBusy(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm text-muted">What you sell (teaches the AI)</label>
        <textarea value={form.businessDescription} onChange={set('businessDescription')} rows={2} className="w-full rounded-lg border border-line bg-surface/70 px-3 py-2 text-sm text-ink outline-none focus:border-cyan" disabled={load} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm text-muted">Business WhatsApp number</label>
          <input value={form.whatsappNumber ?? ''} onChange={set('whatsappNumber')} className={input} disabled={load} />
        </div>
        <div>
          <label className="text-sm text-muted">Escalation phone</label>
          <input value={form.escalationPhone ?? ''} onChange={set('escalationPhone')} className={input} disabled={load} />
        </div>
        <div>
          <label className="text-sm text-muted">AI tone</label>
          <select value={form.tone} onChange={set('tone')} className={input} disabled={load}>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="pidgin-mix">Pidgin-mix</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted">Model (prod swap)</label>
          <select value={form.model} onChange={set('model')} className={input} disabled={load}>
            <option value="mock">MockLLM (no key)</option>
            <option value="openai">OpenAI / OpenRouter</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.pidginEnabled} onChange={(e) => setForm((f) => ({ ...f, pidginEnabled: e.target.checked }))} className="accent-cyan" disabled={load} />
        Enable Pidgin English (Pidgin support mandatory for WhatsApp selling in Naija 🇳🇬)
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || load} className="h-10 rounded-lg bg-cyan px-4 font-semibold text-bg hover:shadow-glow disabled:opacity-50">Save</button>
        {saved && <span className="text-sm text-green">Saved ✓</span>}
      </div>
    </form>
  );
}

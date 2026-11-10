'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function BroadcastComposer() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');
  const [audience, setAudience] = React.useState('all');
  const [pidgin, setPidgin] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return setErr('Name and message are required.');
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, audience, pidgin }),
      });
      const j = await res.json();
      if (!j.ok) return void setErr(j.reason || 'Could not create broadcast.');
      setName('');
      setContent('');
      router.refresh();
    } catch {
      setErr('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'h-10 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan';
  return (
    <form onSubmit={submit} className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-ink">New broadcast</h3>
      <div className="mt-3 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Campaign name (e.g. Black Friday promo)" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface/70 px-3 py-2 text-sm text-ink outline-none focus:border-cyan" placeholder="Message your leads will receive…" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="text-muted">Audience:</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-lg border border-line bg-surface/70 px-2 py-1.5 text-sm text-ink outline-none">
            <option value="all">All leads</option>
            <option value="hot">Hot / qualified only</option>
            <option value="won">Won (repeat customers)</option>
          </select>
          <label className="flex items-center gap-1.5 text-muted">
            <input type="checkbox" checked={pidgin} onChange={(e) => setPidgin(e.target.checked)} className="accent-cyan" /> Pidgin tone
          </label>
        </div>
        {err && <p className="text-sm text-magenta">{err}</p>}
        <button type="submit" disabled={busy} className="h-11 w-full rounded-lg bg-purple font-semibold text-white hover:shadow-glow disabled:opacity-50">
          {busy ? 'Sending…' : 'Send broadcast'}
        </button>
      </div>
    </form>
  );
}

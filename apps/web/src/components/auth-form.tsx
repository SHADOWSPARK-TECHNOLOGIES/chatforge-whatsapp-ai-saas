'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: '', email: '', password: '', businessName: '' });
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) return void setError(json.reason || 'Something went wrong.');
      router.replace(json.redirect || '/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'h-10 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan';
  return (
    <form onSubmit={submit} className="glass mx-auto mt-10 max-w-md rounded-2xl p-6">
      <h1 className="text-2xl font-bold text-ink">{mode === 'signup' ? 'Create your account' : 'Log in'}</h1>
      <p className="mt-1 text-sm text-muted">{mode === 'signup' ? 'Start a 14-day free trial — no card needed.' : 'Welcome back.'}</p>

      <div className="mt-5 space-y-3">
        {mode === 'signup' && (
          <>
            <input value={form.name} onChange={set('name')} placeholder="Your name" className={input} required />
            <input value={form.businessName} onChange={set('businessName')} placeholder="Business name (e.g. Ada's Fashion Store)" className={input} required />
          </>
        )}
        <input type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" className={input} required />
        <input type="password" value={form.password} onChange={set('password')} placeholder="Password (min 6 chars)" className={input} required minLength={6} />
      </div>

      {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-lg bg-cyan font-semibold text-bg hover:shadow-glow disabled:opacity-50">
        {busy ? 'One sec…' : mode === 'signup' ? 'Start free trial' : 'Log in'}
      </button>
      {mode === 'signup' && <p className="mt-3 text-center text-xs text-dim">Demo mode note: with no DB this still signs you in locally.</p>}
    </form>
  );
}

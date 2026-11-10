'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MarketingHeader } from '@/components/marketing-header';

type Product = { name: string; description: string; priceNgn: number; category: string; inStock: boolean };
const EMPTY_PRODUCT: Product = { name: '', description: '', priceNgn: 0, category: 'Dresses', inStock: true };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [businessDescription, setBusinessDescription] = React.useState('');
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [tone, setTone] = React.useState<'formal' | 'casual' | 'pidgin-mix'>('pidgin-mix');
  const [pidginEnabled, setPidginEnabled] = React.useState(true);
  const [escalationPhone, setEscalationPhone] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);

  const input = 'h-10 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan';
  const setP = (i: number, k: keyof Product, v: string | number | boolean) =>
    setProducts((arr) => arr.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDescription, whatsappNumber, tone, pidginEnabled, escalationPhone, products }),
      });
      const json = await res.json();
      if (!json.ok) return void setError(json.reason || 'Could not save.');
      router.replace(json.redirect || '/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const tones: Array<[string, string, typeof tone]> = [
    ['Formal', 'Polished, professional English', 'formal'],
    ['Casual', 'Friendly, relaxed English', 'casual'],
    ['Pidgin-mix', 'English + Pidgin (great for WhatsApp)', 'pidgin-mix'],
  ];

  const padding = 'mx-auto max-w-2xl px-4 py-10';
  return (
    <div>
      <MarketingHeader />
      <div className={padding}>
        <h1 className="text-2xl font-bold text-ink">Set up your store (step {step + 1}/3)</h1>
        <div className="mt-2 h-1 w-full overflow-hidden rounded bg-white/10">
          <div className="h-full bg-cyan transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm text-muted">Business WhatsApp number (e.g. +2348123456789)</label>
              <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className={input} placeholder="+234 ..." />
            </div>
            <div>
              <label className="text-sm text-muted">What do you sell? (teaches the AI)</label>
              <textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface/70 px-3 py-2 text-sm text-ink outline-none focus:border-cyan" placeholder="e.g. We sell ankara dresses, senator wears and custom tailoring in Lagos." />
            </div>
            <button onClick={() => setStep(1)} className="h-11 w-full rounded-lg bg-cyan font-semibold text-bg hover:shadow-glow">Next: add products</button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-3">
            {products.length === 0 && (
              <p className="text-sm text-dim">No products yet — add one below, or skip (you can add them later in Settings).</p>
            )}
            {products.map((p, i) => (
              <div key={i} className="glass rounded-xl p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={p.name} onChange={(e) => setP(i, 'name', e.target.value)} className={input} placeholder="Product name" />
                  <input type="number" value={p.priceNgn || ''} onChange={(e) => setP(i, 'priceNgn', Number(e.target.value))} className={input} placeholder="Price (₦)" />
                  <input value={p.description} onChange={(e) => setP(i, 'description', e.target.value)} className={`${input} sm:col-span-2`} placeholder="Short description" />
                </div>
                <button onClick={() => setProducts((a) => a.filter((_, idx) => idx !== i))} className="mt-2 text-xs text-magenta">Remove</button>
              </div>
            ))}
            <button onClick={() => setProducts((a) => [...a, { ...EMPTY_PRODUCT }])} className="rounded-lg border border-line px-4 py-2 text-sm text-cyan hover:border-cyan">+ Add product</button>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="h-11 flex-1 rounded-lg border border-line text-ink hover:border-cyan">Back</button>
              <button onClick={() => setStep(2)} className="h-11 flex-1 rounded-lg bg-cyan font-semibold text-bg hover:shadow-glow">Next: voice</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            <label className="text-sm text-muted">How should your AI sales rep talk?</label>
            <div className="grid gap-2">
              {tones.map(([label, desc, val]) => (
                <button key={val} onClick={() => setTone(val)} className={`rounded-xl border p-3 text-left ${tone === val ? 'border-cyan bg-cyan/5' : 'border-line'}`}>
                  <div className="font-semibold text-ink">{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={pidginEnabled} onChange={(e) => setPidginEnabled(e.target.checked)} className="accent-cyan" />
              Enable Pidgin English (recommended)
            </label>
            <div>
              <label className="text-sm text-muted">Escalation phone (who gets the &ldquo;talk to a human&rdquo; handoff)</label>
              <input value={escalationPhone} onChange={(e) => setEscalationPhone(e.target.value)} className={input} placeholder="+234 ..." />
            </div>
            {error && <p className="text-sm text-magenta">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="h-11 flex-1 rounded-lg border border-line text-ink hover:border-cyan">Back</button>
              <button onClick={submit} disabled={busy} className="h-11 flex-1 rounded-lg bg-purple font-semibold text-white hover:shadow-glow disabled:opacity-50">
                {busy ? 'Saving…' : 'Finish setup 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

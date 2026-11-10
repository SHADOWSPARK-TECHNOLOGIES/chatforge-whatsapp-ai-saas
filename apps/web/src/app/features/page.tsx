import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

const SECTIONS = [
  ['AI Sales Agent', 'Understands product catalogs, quotes real prices in ₦, and pushes leads toward payment.'],
  ['Pidgin-first NLP', 'Detects intent from Nigerian English AND Pidgin ("wetin be the price?", "abeg how much").'],
  ['In-chat Paystack', 'Generates secure Paystack payment links inside the conversation and confirms payment via webhook.'],
  ['Automated follow-up', 'Drip sequences (2h/24h/72h) keep hot leads warm with no manual work.'],
  ['Human escalation', 'Two unresolved rounds or "talk to a human" → auto-escalate, notify the team.'],
  ['Multi-tenant CRM', 'Every lead scoped to your business — no cross-tenant data leaks.'],
];

export default function FeaturesPage() {
  return (
    <div>
      <MarketingHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold text-ink">Features</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(([t, d]) => (
            <div key={t} className="glass rounded-2xl p-5">
              <div className="font-semibold text-ink">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
        <Link href="/signup" className="mt-8 inline-block rounded-lg bg-cyan px-6 py-3 font-semibold text-bg hover:shadow-glow">Start free trial</Link>
      </div>
    </div>
  );
}

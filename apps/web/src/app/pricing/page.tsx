import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

const TIERS = [
  ['FREE', 0, ['Up to 500 conversations/mo', '1 broadcast/mo', '1 follow-up sequence', 'English + Pidgin', 'Mock WhatsApp (no Meta approval needed)']],
  ['BASIC', 15000, ['Up to 3,000 conversations/mo', '10 broadcasts/mo', '3 follow-up sequences', 'Paystack payment links', 'Priority email support']],
  ['PRO', 35000, ['Up to 10,000 conversations/mo', '50 broadcasts/mo', '10 follow-up sequences', 'Advanced analytics + CSV export', 'Real WhatsApp Cloud API + dedicated support']],
  ['ENTERPRISE', 0, ['Unlimited', 'Custom broadcasts', 'Custom AI model + tone', 'Dedicated onboarding', 'Custom pricing']],
] as const;

export default function PricingPage() {
  return (
    <div>
      <MarketingHeader />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold text-ink">Pricing — ₦ per month</h1>
        <p className="mt-1 text-sm text-muted">Start free. Upgrade when you grow. Billed via Paystack.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map(([name, price, points]) => (
            <div key={name} className="glass flex flex-col rounded-2xl p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-cyan">{name}</div>
              <div className="mt-2 font-mono text-3xl font-bold text-ink">
                {price === 0 ? '₦0' : `₦${price.toLocaleString('en-NG')}`}
                <span className="text-sm text-muted"> /mo</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                {points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <Link href={name === 'ENTERPRISE' ? 'mailto:chatforge@shadowspark.tech' : '/signup'} className="mt-5 rounded-lg bg-cyan px-4 py-2 text-center text-sm font-semibold text-bg hover:shadow-glow">
                {name === 'ENTERPRISE' ? 'Talk to us' : 'Start free'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

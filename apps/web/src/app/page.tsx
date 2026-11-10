import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

const FEATURES = [
  ['24/7 WhatsApp selling', 'Your AI sales rep never sleeps — answers, quotes and follows up at 2am.'],
  ['English + Pidgin', 'Pidgin support is built-in: "How far! Wetin I fit help you?"'],
  ['Paystack in-chat', 'Send secure payment links and close the sale right in WhatsApp.'],
  ['Auto follow-up', 'Drip sequences nudge hot leads when they go quiet.'],
  ['Smart CRM', 'Every lead qualified, scored and funnelled automatically.'],
  ['Human handoff', 'When it matters, the AI escalates to your team in one tap.'],
];

export default function LandingPage() {
  return (
    <div>
      <MarketingHeader />
      <section className="cyber-grid-bg border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan">ShadowSpark · Chatforge</span>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
            Your WhatsApp sales rep <span className="cyber-text-grad">that never sleeps.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            CHATFORGE gives Nigerian SMEs a 24/7 AI sales agent that talks English &amp; Pidgin,
            qualifies leads, quotes prices, collects payments via Paystack and escalates to a
            human when it matters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-lg bg-cyan px-6 py-3 font-semibold text-bg hover:shadow-glow">Start free trial</Link>
            <Link href="/pricing" className="rounded-lg border border-line px-6 py-3 font-semibold text-ink hover:border-cyan hover:text-cyan">See pricing</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-ink">Everything you need to sell on WhatsApp</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="glass rounded-2xl p-5">
              <div className="font-semibold text-ink">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-ink">Trusted by Nigerian businesses</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Ada's Fashion Store", 'Lagos', '"The agent closed 4 orders while I slept."'],
              ['FreshMart Lagos', 'Lagos', '"Pidgin support made customers feel heard."'],
              ['Kano Kicks', 'Kano', '"Follow-ups tripled our WhatsApp conversions."'],
            ].map(([name, city, quote]) => (
              <div key={name} className="glass rounded-2xl p-5">
                <p className="text-sm italic text-ink">&ldquo;{quote}&rdquo;</p>
                <div className="mt-3 text-sm font-semibold text-cyan">{name}</div>
                <div className="text-xs text-muted">{city}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

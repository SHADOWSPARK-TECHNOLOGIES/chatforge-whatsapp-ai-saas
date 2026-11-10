import Link from 'next/link';

export async function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-mono text-lg font-bold cyber-text-grad">ss//chatforge</Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/features" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-cyan">Features</Link>
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-cyan">Pricing</Link>
          <Link href="/login" className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-cyan hover:text-cyan">Log in</Link>
        </nav>
      </div>
    </header>
  );
}

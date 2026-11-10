import Link from 'next/link';
import { getSession } from '@/lib/session';

const NAV = [
  ['/dashboard', 'Overview'],
  ['/conversations', 'Conversations'],
  ['/leads', 'Leads'],
  ['/broadcasts', 'Broadcasts'],
  ['/analytics', 'Analytics'],
  ['/settings', 'Settings'],
  ['/billing', 'Billing'],
];

export async function DashboardShell({ children, cta }: { children: React.ReactNode; cta?: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="font-mono text-lg font-bold cyber-text-grad">ss//chatforge</Link>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="hidden md:inline">{session?.email ?? 'demo'}</span>
          {cta}
          <Link href="/api/auth/logout" className="hover:text-cyan">Log out</Link>
        </div>
      </div>
      <nav className="mt-5 flex flex-wrap gap-1 border-b border-line pb-3">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-white/5 hover:text-cyan">{label}</Link>
        ))}
        {session?.role === 'ADMIN' && (
          <Link href="/admin/tenants" className="rounded-lg px-3 py-1.5 text-sm text-purple hover:bg-white/5">Admin</Link>
        )}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}

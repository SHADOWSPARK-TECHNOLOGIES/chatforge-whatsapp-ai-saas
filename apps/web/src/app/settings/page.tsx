import { DashboardShell } from '@/components/dashboard-shell';
import { Card, Badge } from '@/components/ui';
import { AIConfigForm } from '@/components/ai-config-form';
import { ProductsManager } from '@/components/products-manager';
import { getTenantData } from '@/lib/data';
import { getSession } from '@/lib/session';
import { dbReady } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await getSession();
  const data = await getTenantData(s?.tenantId ?? 'demo-tenant');
  const load = !(await dbReady());
  const hasToken = !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;

  return (
    <DashboardShell>
      <h1 className="text-xl font-bold text-ink">Settings</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Business profile & AI voice">
          <AIConfigForm
            load={load}
            initial={{
              businessDescription: (data as any).tenant.businessDescription ?? '',
              whatsappNumber: (data as any).tenant.settings?.whatsappNumber,
              tone: (data as any).tenant.settings?.tone ?? 'pidgin-mix',
              pidginEnabled: (data as any).tenant.pidginEnabled ?? true,
              escalationPhone: (data as any).tenant.settings?.escalationPhone,
              model: (data as any).tenant.settings?.model ?? 'mock',
            }}
          />
        </Card>
        <div className="space-y-5">
          <Card title="Products & services">
            <ProductsManager products={(data as any).products} load={load} />
          </Card>
          <Card title="WhatsApp connection">
            {hasToken ? (
              <div className="text-sm"><Badge tone="green">CONNECTED</Badge><p className="mt-2 text-muted">Meta Cloud API live.</p></div>
            ) : (
              <div className="text-sm"><Badge tone="amber">MOCK MODE</Badge><p className="mt-2 text-muted">No WHATSAPP_TOKEN set — replies are logged to the worker console. Add env vars to go live with Meta Cloud API.</p></div>
            )}
            <div className="mt-3 font-mono text-[11px] text-dim">WHATSAPP_PHONE_NUMBER_ID: {process.env.WHATSAPP_PHONE_NUMBER_ID ? '••••' + process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4) : '(unset)'}</div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

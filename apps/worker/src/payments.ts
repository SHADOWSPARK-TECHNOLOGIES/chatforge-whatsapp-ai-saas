import { config } from './config.js';

export interface PaymentRequestResult {
  link: string;
  reference: string;
}

/**
 * Paystack payment-shortlink / payment-page generation.
 * Mock mode produces a deterministic fake link; real mode calls Paystack.
 * (Phase 3 wires the webhook/verify flow; this is the link generator.)
 */
export async function createPaymentLink(opts: {
  email: string;
  amountNgn: number;
  reference: string;
  description?: string;
}): Promise<PaymentRequestResult> {
  if (!config.paystackSecretKey) {
    const link = `https://paystack.com/pay/mock-${opts.reference}`;
    console.log(`[mock-paystack] link → ${link} (₦${opts.amountNgn})`);
    return { link, reference: opts.reference };
  }
  const res = await fetch(`${config.paystackBaseUrl}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.paystackSecretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: opts.email,
      amount: Math.round(opts.amountNgn * 100), // kobo
      reference: opts.reference,
      currency: 'NGN',
      metadata: { description: opts.description },
    }),
  });
  const json = (await res.json()) as { status: boolean; data?: { authorization_url: string } };
  if (!res.ok || !json.status || !json.data) {
    throw new Error('Paystack initialize failed');
  }
  return { link: json.data.authorization_url, reference: opts.reference };
}

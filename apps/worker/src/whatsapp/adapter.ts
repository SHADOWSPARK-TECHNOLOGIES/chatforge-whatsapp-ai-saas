import { config } from '../config.js';

export interface SendResult {
  ok: boolean;
  id?: string;
  via: 'mock' | 'cloud-api';
  to: string;
  content: string;
}

export interface WhatsAppAdapter {
  readonly name: string;
  sendMessage(to: string, content: string): Promise<SendResult>;
}

/**
 * Mock adapter: logs to console (and the caller saves the AGENT message to DB).
 * Used when WHATSAPP_TOKEN is absent — so the whole system works without Meta approval.
 */
export class MockWhatsApp implements WhatsAppAdapter {
  readonly name = 'mock';
  async sendMessage(to: string, content: string): Promise<SendResult> {
    console.log(`[mock-whatsapp] → ${to}: ${content.length > 160 ? content.slice(0, 157) + '…' : content}`);
    return { ok: true, id: `mock_${Date.now()}`, via: 'mock', to, content };
  }
}

/** Real adapter for the Meta WhatsApp Cloud API. Enabled by WHATSAPP_TOKEN + phone id. */
export class CloudWhatsApp implements WhatsAppAdapter {
  readonly name = 'cloud-api';
  async sendMessage(to: string, content: string): Promise<SendResult> {
    if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
      return new MockWhatsApp().sendMessage(to, content);
    }
    const url = `https://graph.facebook.com/v19.0/${config.whatsappPhoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: content },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }> };
    if (!res.ok) return { ok: false, via: 'cloud-api', to, content };
    return { ok: true, id: json.messages?.[0]?.id, via: 'cloud-api', to, content };
  }
}

/** Pick the adapter based on env. */
export function makeAdapter(): WhatsAppAdapter {
  return config.whatsappToken ? new CloudWhatsApp() : new MockWhatsApp();
}

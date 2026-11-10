export interface WhatsAppAdapter {
  name: string;
  sendMessage(to: string, content: string): Promise<{ ok: boolean }>;
}

export function makeAdapter(): WhatsAppAdapter {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return {
      name: 'cloud',
      async sendMessage(to, content) {
        const res = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: content } }),
        });
        return { ok: res.ok };
      },
    };
  }
  return {
    name: 'mock',
    async sendMessage(to, content) {
      console.log(`[mock-whatsapp] → ${to}: ${content}`);
      return { ok: true };
    },
  };
}

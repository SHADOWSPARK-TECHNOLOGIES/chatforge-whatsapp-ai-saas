// Normalization pipeline: Meta Cloud API payload → unified IncomingMessage.

export type IncomingMessageType = 'text' | 'image' | 'location' | 'button' | 'voice' | 'unknown';

export interface IncomingMessage {
  /** Meta message id — used as idempotency key. */
  id: string;
  from: string; // wa_id, e.g. +2347030001000
  profileName?: string;
  timestamp: string;
  type: IncomingMessageType;
  text?: string;
  buttonText?: string;
  location?: { lat: number; lng: number; name?: string };
  mediaId?: string;
}

export function normalizeMetaWebhook(payload: unknown): IncomingMessage[] {
  const p = payload as {
    object?: string;
    entry?: Array<{ changes?: Array<{ field?: string; value?: MetaValue }> }>;
  };
  if (p?.object === 'whatsapp_business_account') {
    const out: IncomingMessage[] = [];
    for (const entry of p.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages' || !change.value) continue;
        const meta = change.value.metadata;
        const contacts = change.value.contacts ?? [];
        const messages = change.value.messages ?? [];
        for (const raw of messages) {
          out.push(toIncoming(raw, contacts[0]));
        }
      }
    }
    return out;
  }
  return [];
}

interface MetaValue {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<MetaMessage>;
}

interface MetaMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string };
  location?: { latitude?: number; longitude?: number; name?: string };
  button?: { text?: string };
  audio?: { id?: string };
}

function toIncoming(m: MetaMessage, contact?: { wa_id?: string; profile?: { name?: string } }): IncomingMessage {
  const from = m.from ?? contact?.wa_id ?? 'unknown';
  let type: IncomingMessageType = 'unknown';
  let text: string | undefined;
  let buttonText: string | undefined;
  let location: IncomingMessage['location'];
  let mediaId: string | undefined;

  switch (m.type) {
    case 'text':
      type = 'text';
      text = m.text?.body;
      break;
    case 'image':
      type = 'image';
      mediaId = m.image?.id;
      break;
    case 'audio':
      type = 'voice';
      mediaId = m.audio?.id;
      break;
    case 'location':
      type = 'location';
      location = { lat: m.location?.latitude ?? 0, lng: m.location?.longitude ?? 0, name: m.location?.name };
      break;
    case 'button':
      type = 'button';
      buttonText = m.button?.text;
      break;
    default:
      type = 'unknown';
  }

  return {
    id: m.id ?? `${Date.now()}`,
    from,
    profileName: contact?.profile?.name,
    timestamp: m.timestamp ?? `${Math.floor(Date.now() / 1000)}`,
    type,
    text,
    buttonText,
    location,
    mediaId,
  };
}

export function messageText(msg: IncomingMessage): string {
  return msg.text || msg.buttonText || (msg.type === 'image' ? '[image]' : msg.type === 'voice' ? '[voice note]' : msg.type === 'location' ? `[location ${msg.location?.name ?? 'shared'}]` : '');
}

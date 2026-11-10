import type { ToolDefinition, ToolResult } from './types.js';

/**
 * Tool interfaces + a factory that wires them to injected data-access clients
 * (worker supplies its Prisma-backed clients). MockLLM keywords are Pidgin-aware
 * so a sales conversation resolves without any LLM key.
 */

export interface ProductInfoInput {
  query?: string;
}
export interface ProductInfoData {
  name: string;
  priceNgn: number;
  description?: string;
  inStock: boolean;
  category?: string;
}

export interface CreateLeadInput {
  whatsappNumber?: string;
  name?: string;
  source?: string;
}
export interface CreateLeadData {
  leadId: string;
  status: string;
}

export interface UpdateLeadStatusInput {
  leadId?: string;
  status?: string;
}
export interface UpdateLeadStatusData {
  leadId: string;
  status: string;
}

export interface RequestPaymentInput {
  leadId?: string;
  amountNgn?: number;
  description?: string;
}
export interface RequestPaymentData {
  link: string;
  reference: string;
  amountNgn: number;
}

export interface ScheduleFollowUpInput {
  leadId?: string;
  trigger?: string;
}
export interface ScheduleFollowUpData {
  scheduled: number;
  nextInHours: number;
}

export interface EscalationData {
  escalate: boolean;
  to: string;
}

export interface HistoryInput {
  limit?: number;
}
export interface HistoryData {
  messages: string[];
}

export interface AgentToolClients {
  getProductInfo: (input: ProductInfoInput) => ToolResult<ProductInfoData> | Promise<ToolResult<ProductInfoData>>;
  createLead: (input: CreateLeadInput) => ToolResult<CreateLeadData> | Promise<ToolResult<CreateLeadData>>;
  updateLeadStatus: (input: UpdateLeadStatusInput) => ToolResult<UpdateLeadStatusData> | Promise<ToolResult<UpdateLeadStatusData>>;
  requestPayment: (input: RequestPaymentInput) => ToolResult<RequestPaymentData> | Promise<ToolResult<RequestPaymentData>>;
  scheduleFollowUp: (input: ScheduleFollowUpInput) => ToolResult<ScheduleFollowUpData> | Promise<ToolResult<ScheduleFollowUpData>>;
  getConversationHistory: (input: HistoryInput) => ToolResult<HistoryData> | Promise<ToolResult<HistoryData>>;
}

function grabPhone(text: string): string | undefined {
  const m = text.match(/\+?234[0-9]{10}|0[789][01][0-9]{8}/);
  return m ? m[0] : undefined;
}

export function createToolkit(clients: AgentToolClients): ToolDefinition[] {
  const { getProductInfo, createLead, updateLeadStatus, requestPayment, scheduleFollowUp } = clients;
  return [
    {
      name: 'getProductInfo',
      description: 'Look up a product from the tenant catalog: name, description, price (₦), availability.',
      keywords: ['product', 'what do you sell', 'watin you sell', 'do you have', 'you get', 'available', 'price', 'how much', 'weda', 'price of', 'list of product', 'catalogue', 'watin dey'],
      extract: (t) => ({ query: t.replace(/price|how much|wetin be the price|abeg|make i see|list|product|catalogue/gi, '').trim() }),
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: [] },
      execute: getProductInfo,
    },
    {
      name: 'createLead',
      description: 'Create or update a lead for this WhatsApp number (first contact).',
      keywords: [],
      extract: (t) => ({ whatsappNumber: grabPhone(t), source: 'whatsapp' }),
      parameters: { type: 'object', properties: { whatsappNumber: { type: 'string' } }, required: ['whatsappNumber'] },
      execute: createLead,
    },
    {
      name: 'updateLeadStatus',
      description: "Move a lead through the funnel: NEW → QUALIFIED → WON / LOST.",
      keywords: ['qualified', 'interested', 'won', 'i dey interested', 'i want', 'i dey buy', 'make i order', 'abeg book', 'send to me'],
      extract: (t) => {
        const phone = grabPhone(t);
        const status = /let me|i want|buy|order|send to me/i.test(t) ? 'QUALIFIED' : 'QUALIFIED';
        return { leadId: phone, status };
      },
      parameters: { type: 'object', properties: { leadId: { type: 'string' }, status: { type: 'string' } }, required: [] },
      execute: updateLeadStatus,
    },
    {
      name: 'requestPayment',
      description: 'Create a Paystack payment link and send it to the customer to pay in ₦.',
      keywords: ['pay', 'payment link', 'account number', 'make i pay', 'transfer', 'pos', 'send pay'],
      extract: (t) => ({ leadId: grabPhone(t), amountNgn: Number((t.match(/(?:₦|naira)?\s?(\d{4,7})/i) || [])[1] || 0) || undefined, description: 'Store order payment' }),
      parameters: { type: 'object', properties: { leadId: { type: 'string' }, amountNgn: { type: 'number' } }, required: ['leadId'] },
      execute: requestPayment,
    },
    {
      name: 'scheduleFollowUp',
      description: 'Enqueue the follow-up drip sequence for a lead (e.g. NEW_LEAD or QUOTE_SENT).',
      keywords: ['follow up', 'remind', 'sequence', 'schedule'],
      extract: (t) => ({ leadId: grabPhone(t), trigger: Object('NEW_LEAD') }),
      parameters: { type: 'object', properties: { leadId: { type: 'string' }, trigger: { type: 'string' } }, required: [] },
      execute: scheduleFollowUp,
    },
  ];
}

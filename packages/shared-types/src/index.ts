// CHATFORGE — shared domain types (single source of truth for web + worker + packages).

export type Plan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
export type UserRole = 'OWNER' | 'STAFF' | 'ADMIN';
export type LeadStatus = 'NEW' | 'QUALIFIED' | 'WON' | 'LOST';
export type ConversationStatus = 'ACTIVE' | 'ESCALATED' | 'CLOSED';
export type MessageRole = 'CUSTOMER' | 'AGENT' | 'HUMAN' | 'SYSTEM';
export type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
export type ScheduledMessageStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE';
export type FollowUpTrigger = 'NEW_LEAD' | 'NO_REPLY_24H' | 'QUOTE_SENT' | 'PAYMENT_SENT_PENDING_48H';

export interface TenantSettings {
  businessDescription: string;
  tone: 'formal' | 'casual' | 'pidgin-mix';
  pidginEnabled: boolean;
  escalationPhone?: string;
  whatsappNumber?: string;
  model?: string; // 'mock' | 'openai'
  defaultModel?: string;
  aiResolution?: boolean;
}

export interface Product {
  name: string;
  description: string;
  priceNgn: number;
  category: string;
  inStock: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  whatsappPhoneId?: string;
  status: TenantStatus;
  paystackCustomerCode?: string;
  settings: TenantSettings;
  productsJson: Product[];
  billingEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  whatsappNumber: string;
  name?: string;
  status: LeadStatus;
  source: string;
  lastContactAt?: string;
  lifetimeValueNgn: number;
  customFields: Record<string, unknown>;
  conversation?: Conversation;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  leadId: string;
  status: ConversationStatus;
  channel: string;
  aiHandled: boolean;
  createdAt: string;
  lastMessageAt?: string;
  messages?: Message[];
  lead?: Lead;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export type IntentKind =
  | 'GREETING'
  | 'INQUIRY_PRODUCT'
  | 'PRICE_QUOTE'
  | 'BOOKING_ORDER'
  | 'PAYMENT_REQUEST'
  | 'COMPLAINT'
  | 'HUMAN_ESCALATION'
  | 'FAREWELL'
  | 'UNKNOWN';

export interface Intent {
  messageId: string;
  intent: IntentKind;
  confidence: number;
  modelUsed: string;
}

export interface ProductService {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  priceNgn: number;
  category: string;
  inStock: boolean;
}

export interface FollowUpStep {
  delayHours: number;
  message: string;
}

export interface FollowUpSequence {
  id: string;
  tenantId: string;
  name: string;
  triggersOn: FollowUpTrigger;
  steps: FollowUpStep[];
  active: boolean;
}

export interface ScheduledMessage {
  id: string;
  followUpId?: string;
  tenantId: string;
  leadId: string;
  sendAt: string;
  status: ScheduledMessageStatus;
  content: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  tenantId: string;
  leadId: string;
  amountNgn: number;
  description: string;
  paystackLink?: string;
  status: PaymentStatus;
  reference?: string;
  createdAt: string;
}

export interface Broadcast {
  id: string;
  tenantId: string;
  name: string;
  audienceFilter: Record<string, unknown>;
  content: string;
  scheduledAt?: string;
  status: BroadcastStatus;
  stats: { sent: number; delivered: number; read: number; failed: number };
  createdAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: Plan;
  status: SubscriptionStatus;
  paystackSubscriptionCode?: string;
  renewsAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actor: string;
  action: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface PlanLimits {
  conversationsPerMonth: number;
  broadcastsPerMonth: number;
  followUpSequences: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { conversationsPerMonth: 500, broadcastsPerMonth: 1, followUpSequences: 1 },
  BASIC: { conversationsPerMonth: 3000, broadcastsPerMonth: 10, followUpSequences: 3 },
  PRO: { conversationsPerMonth: 10000, broadcastsPerMonth: 50, followUpSequences: 10 },
  ENTERPRISE: { conversationsPerMonth: 100000, broadcastsPerMonth: 500, followUpSequences: 100 },
};

export const PLAN_PRICES_NGN: Record<Plan, number> = {
  FREE: 0,
  BASIC: 15000,
  PRO: 35000,
  ENTERPRISE: 0, // custom
};

import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'chatforge_verify',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  redisUrl: process.env.REDIS_URL || '',
  conversationWindow: 10,
  rateLimitPerLead: 5,
  rateLimitWindowMs: 10_000,
};

export function isMockMode() {
  return !config.whatsappToken;
}

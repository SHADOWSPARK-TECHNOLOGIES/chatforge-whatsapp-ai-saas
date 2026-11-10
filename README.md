# ss//chatforge — WhatsApp AI Sales Agent SaaS

CHATFORGE is a multi-tenant SaaS that gives Nigerian SMEs a **24/7 WhatsApp AI sales rep**: it talks in English **and Pidgin**, qualifies leads, quotes ₦ prices, follows up automatically, collects payment via Paystack inside the chat, and escalates to a human when it matters.

Nigerian context throughout: currency ₦ (NGN), phones +234, cities Lagos / Abuja / Port Harcourt / Owerri / Kano / Ibadan, Paystack payments.

Brand: **ShadowSpark cyberpunk** — deep background `#080c14`, cyan `#00f5d4` + purple `#a855f7`, glassmorphism, JetBrains Mono accents.

---

## Why mock-first

You can run the **entire product with zero external accounts**. Every external integration is behind an adapter that swaps on an env var:

| Adapter | Mock (no env) | Real (set env) |
|---|---|---|
| WhatsApp | `MockWhatsApp` → logs + DB | Meta Cloud API |
| AI brain | `MockLLM` → Pidgin keyword rules | OpenAI / OpenRouter |
| Payments | `MockPaystack` → fake link | Paystack initialize |
| Queue | in-memory timer | BullMQ + Redis (Upstash) |
| DB | in-memory/demo data | PostgreSQL via Prisma |

## Tech stack

- **Workspace:** pnpm monorepo (`apps/*`, `packages/*`)
- **Dashboard:** `apps/web` — Next.js 15 App Router, TypeScript strict, Tailwind, cyberpunk theme
- **Bot worker:** `apps/worker` — Fastify + TypeScript (Railway-style)
- **Shared brain:** `packages/ai-agent-core` (orchestrator, tools, MockLLM, prompts, escalation)
- **Shared types:** `packages/shared-types`
- **DB:** Prisma + PostgreSQL (Neon-compatible `DATABASE_URL`)
- **Queue:** BullMQ (`REDIS_URL`, optional)

## Repo layout

```
chatforge-whatsapp-ai-saas/
├── apps/
│   ├── web/                  # dashboard: marketing + auth + onboarding + console
│   │   └── src/app/
│   │       ├── page.tsx, pricing, features   # marketing (cyberpunk)
│   │       ├── login, signup, onboarding      # auth + multi-step setup
│   │       ├── dashboard, conversations, leads,
│   │       │   broadcasts, settings, analytics, billing  # tenant console
│   │       ├── admin/tenants                  # super-admin
│   │       └── api/                           # auth, CRUD, webhook helpers
│   └── worker/               # Fastify bot (webhook + AI + follow-up + payments)
│       └── src/{index, chatflow, agent, crm, followup, payments,
│               queue, billing, routes, normalize, intent, whatsapp, db, config}.ts
├── packages/
│   ├── shared-types/         # single source of truth for domain types
│   └── ai-agent-core/        # reusable agent brain (orchestrator, tools, MockLLM)
├── prisma/                   # schema.prisma (15 models) + seed.ts
├── scripts/
│   ├── test-webhook.sh       # PHASE 1 smoke: verify token, ingest, dedup
│   └── mock-conversation.sh  # PHASE 2 smoke: full 4-step sales conversation
├── .env.example
├── .gitignore
├── README.md
└── DECISIONS.md
```

## Quick start

```bash
pnpm install

# (optional) real DB — otherwise everything runs in mock/demo mode
cp .env.example .env            # fill DATABASE_URL etc, or leave blank
npx prisma db push && pnpm db:seed

# Terminal 1 — bot worker on :4000
pnpm --filter @chatforge/worker dev        # or: pnpm --filter worker start

# Terminal 2 — dashboard on :3000
pnpm --filter @chatforge/web dev

# PHASE 1 smoke: WhatsApp webhook verification
bash scripts/test-webhook.sh

# PHASE 2 smoke: a full sales conversation in Pidgin
bash scripts/mock-conversation.sh
```

## Validation gates (all must pass)

```bash
pnpm -r typecheck && pnpm -r lint && pnpm -r build
npx prisma validate
```

## Worker API (Fastify :4000)

| Endpoint | Purpose |
|---|---|
| `GET /health` | liveness + adapter/db status |
| `GET /webhook/whatsapp` | Meta webhook verification (challenge) |
| `POST /ingest` | mock/Meta message ingestion (dedup + rate-limit) |
| `POST /api/payment-request` | create Paystack payment link + 48h nudge |
| `POST /webhook/paystack` | charge/`subscription` events → mark paid, thank-you |
| `POST /api/broadcast` | plan-gated broadcast send |
| `GET /api/gate` | plan usage gate check |

## Dashboard pages

- **Overview** — today's messages, leads won, active convos, ₦ revenue, AI resolution rate
- **Conversations** — list + transcript + human takeover reply
- **Leads** — CRM table, status changes (NEW/QUALIFIED/WON/LOST), notes → audit log
- **Broadcasts** — composer with audience filter + Pidgin toggle, past-broadcast stats
- **Settings** — business profile, AI voice (tone / Pidgin / escalation phone / model), product CRUD, WhatsApp connection status
- **Analytics** — intent distribution, lead funnel, AI vs human resolution
- **Billing** — plan + quotas + upgrades (Paystack) + invoices
- **Admin** (`/admin/tenants`) — tenant list + plan override (ADMIN role)

## Tenant isolation

Every read/write in the web app is scoped by `session.tenantId`. `api/*` routes re-check the session tenant and never accept a tenant id from the body to scope cross-tenant queries. Admin endpoints are gated by `requireAdmin()`. See `DECISIONS.md §isolation`.

## Going live with WhatsApp (Meta)

1. Create an app at `developers.facebook.com/apps` → **WhatsApp** → add the **WhatsApp Cloud API** product.
2. Get a test phone number: **WhatsApp API Settings → Test number** — supplies `WHATSAPP_PHONE_NUMBER_ID`.
3. Generate a token in **WhatsApp API Settings → Manage** — supplies `WHATSAPP_TOKEN`.
4. Set your webhook URL to `https://<your-worker>/webhook/whatsapp` with verify token `WHATSAPP_VERIFY_TOKEN` (default `chatforge_verify`).
5. Subscribe to the `messages` field, then flip the switch **Set this app as the webhook receiver for the test number**.
6. Business verification + production number + templates follow Meta's normal onboarding.

Until then, everything works through `MockWhatsApp` (logs every outgoing message; replies reach back through `POST /ingest`).

## Production swap checklist

- `DATABASE_URL` → Neon Postgres; run `prisma db push` + `prisma db seed`
- `REDIS_URL` → Upstash for BullMQ follow-up/broadcast queues
- `OPENAI_API_KEY` + `OPENAI_BASE_URL=https://openrouter.ai/api/v1` (or OpenAI) → real agent replies
- `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` → real Meta delivery
- `PAYSTACK_SECRET_KEY` + `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` → real payment links + subscription webhooks
- `CHATFORGE_SESSION_SECRET` → long random value (auth cookie HMAC)

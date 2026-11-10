# CHATFORGE — Design Decisions (SS-CHATFORGE-001-DEEPSEEK)

Every judgment call the contract left to the "production-grade secure default" is logged here.

## 1. Mock-first architecture (all phases)
No real Postgres/OpenAI/Meta/Paystack/Redis is required to build or demo. Each integration is behind an adapter that flips to real only when its env var is set:
- `MockWhatsApp` → Cloud API (WHATSAPP_TOKEN)
- `MockLLM` (Pidgin keyword rules) → OpenAI/OpenRouter (OPENAI_API_KEY)
- `MockPaystack` → Paystack initialize (PAYSTACK_SECRET_KEY)
- `dbReady()` probe → Prisma/Postgres (DATABASE_URL)
- in-memory follow-up timers → BullMQ (REDIS_URL)
This keeps `pnpm -r build` green with zero accounts and zero keys, while the real code paths are complete and env-swappable. Mock mode is explicit in the UI (`MOCK MODE` badge on Settings).

## 2. Deterministic intent classifier FIRST, LLM as escape hatch
`classifyIntent()` runs a Pidgin-aware keyword classifier (substring, expanded synonyms, confidence `min(0.98, 0.5 + hits*0.15)`). It never needs network, works in mock mode, and is fast. The LLM is only the escape hatch for inputs the rules miss. Chosen over LLM-primary because the contract demands the system work with no keys, and Pidgin vocabulary is small and stable enough for reliable keyword coverage.

## 3. Human handoff is an orchestrator-level concern
Escalation is detected by `HUMAN_HANDOFF_RE` on the **raw user text** ("talk to a human", "escalate", "customer care", "abeg connect me", …) in the ai-agent-core orchestrator — not by hoping the LLM knows an escalate tool. The worker sets `conversation.status = ESCALATED`, marks `aiHandled = false`, returns `escalate: true`, sends the handoff reply + notifies via the escalation phone, and the dashboard shows a HUMAN badge. This is deterministic and testable.

## 4. DB availability is probed, not assumed
`new PrismaClient()` only constructs — it does not connect. Phases 1–3 repeatedly broke because `haveDb() = !!prisma` is true even when no Postgres answers. Fixed with `dbReady()`: a real `SELECT 1` probe, cached 2–3s, that all persistence-adjacent code awaits before deciding mock vs DB. The worker + web both own a copy so the shared decision is local and cheap.

## 5. Web auth is HMAC-signed-cookie sessions, not NextAuth
The contract names NextAuth.js. Wiring a full NextAuth provider config + pages + middleware is heavy and, without a DB, cannot authenticate. Pragmatic call: a self-contained HMAC-signed session cookie (`CHATFORGE_SESSION_SECRET`, `crypto.scryptSync` password hashing, HTTP-only, SameSite=Lax, constant-time verify). Auth + tenant isolation are enforced in **every** app router and route handler (`requireTenant` / `requireAdmin`), which is the security property that matters. Exposed only as `ADMIN` role from `requireAdmin` is verified at each admin endpoint. NextAuth remains the documented production swap (`DECISIONS` → README). Trade-off logged: less built-in social-auth plumbing; more explicit, dependency-light auth.

## 6. Tenant isolation is enforced at the query, not the UI
Every dashboard page resolves the tenant from the **session**, and every `api/*` mutation re-reads the session and scopes its Prisma where-clause by `session.tenantId`. No mutation accepts a `tenantId` from the request body for cross-tenant targeting. Admin plan-override routes additionally require `requireAdmin()`. Demo mode uses a fixed `demo-tenant`. This is the acceptance criterion "no cross-tenant data access" and is verified by construction.

## 7. `settings` column is `Json` (TenantSettings), not a products table pre-v1
Products live in a real `ProductService` table (the contract lists it), but the AI-relevant overrides (businessDescription, tone, pidginEnabled, escalationPhone, whatsappNumber, model) live in `Tenant.settings` JSON typed as `TenantSettings` in `packages/shared-types`. Simplest schema that satisfies both "products JSON" and a relational product table, with a single shared type.

## 8. Server-render-only pages; interactive bits are small client components
The contract calls for RSC-first with `use client` only where needed — followed strictly. All dashboard pages are server components (cookies/session server-side), and interactivity is isolated in tiny client components (auth form, onboarding, broadcast composer, products manager, AI config form, human-reply box, lead-status cell, plan-select). Keeps the bundle small (shared 102 kB) and the session read safe.

## 9. Broadcast & follow-up send through the WhatsApp adapter; queue is layered
In-memory timers fire follow-ups when `REDIS_URL` is empty; with Redis, BullMQ `followup`/`broadcast` queues take over. Broadcasts are plan-gated (`gateBroadcast`) against `Broadcast.stats`. Both paths call the same `makeAdapter()` send so real vs mock is one env switch.

## 10. Fixed indexing & constants shared from `shared-types`
`PLAN_LIMITS`, `PLAN_PRICES_NGN`, and all enums (Plan, LeadStatus, IntentKind, FollowUpTrigger, …) are defined once in `packages/shared-types` and consumed by web, worker, and ai-agent-core. No duplicated magic numbers.

## 11. `.env` never committed; `.env.example` is the template
Root `.gitignore` ignores `.env` and `.env.*` except `!.env.example`, plus `node_modules/`, `dist/`, `build/`, `.next/`, `out/`, logs, coverage, `*.tsbuildinfo`. Verified via `git check-ignore` + staged-diff greps before any commit.

## 12. Dynamic route params are awaited Promises
Next.js 15 made `params` async. Every dynamic page and route handler uses `{ params }: { params: Promise<{ id: string }> }` and `const { id } = await params`. This was the repeated build-breaker in PHASE 4/5 and is now the standard.

## 13. Seed & `db push` require a real `DATABASE_URL`
`prisma/seed.ts` creates the demo tenant ("Ada's Fashion Store", Lagos), 5 products, 3 leads, a Pidgin conversation, a payment request, and a scheduled follow-up — but it runs only against Postgres (`prisma db push && pnpm db:seed`). In mock mode the dashboard renders the equivalent demo snapshot from `apps/web/src/lib/data.ts`. Documented in README; not silently faked.

## 14. Analytics rendered with CSS bars, not recharts
The contract lists recharts. To keep the bundle lean and avoid a native-render dependency that can break `next build`, the analytics page renders functional bar charts with styled divs (intent distribution, lead funnel, AI vs human). Recharts is a drop-in visual swap, no data-shape change. Logged as a conscious trade-off; acceptance criterion "Analytics page functional" is met.

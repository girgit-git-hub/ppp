# ProofPay

AI-verified proof of work with risk-aware PayPal payouts.

## Stack

- React + Vite + TypeScript
- Fastify + TypeScript
- PostgreSQL + Prisma
- PayPal REST APIs + Payouts + Webhooks
- PayPal Agent Toolkit + PayPal MCP configuration
- AI vision adapter: OpenAI GPT-4o or Gemini 2.5 Flash
- Sharp + pHash + Exifr
- Render Workflows SDK
- AG Grid / AG Charts
- Bryntum Scheduler Pro adapter (optional licensed dependency)
- Leaflet + OpenStreetMap
- Channel3 product-data adapter

## Quick start

1. Copy `.env.example` to `.env` and fill PayPal sandbox credentials.
2. Start PostgreSQL: `docker compose up -d postgres`
3. Install dependencies: `npm install`
4. Generate Prisma client: `npm run db:generate`
5. Migrate: `npm run db:migrate`
6. Seed: `npm run db:seed`
7. Start: `npm run dev`
8. Open http://localhost:5173

The app does **not** contain a mock AI fallback: configure `AI_PROVIDER=openai` with `OPENAI_API_KEY` or `AI_PROVIDER=gemini` with `GOOGLE_API_KEY`. Without a valid key, AI verification and AI analysis return a visible error.

## PayPal

Create a PayPal sandbox REST app and put its client ID/secret in `.env`. The backend uses OAuth 2.0 and REST APIs. Payouts are deliberately gated by the verification decision and an idempotency key.

For webhook testing, expose `POST /api/webhooks/paypal` over HTTPS (for example through a tunnel) and register the URL in the PayPal Developer Dashboard. Set `PAYPAL_WEBHOOK_ID` for signature verification.

## PayPal MCP

`mcp.json` contains a sandbox MCP configuration template, but the Dashboard agent route does not invoke MCP or PayPal Agent Toolkit. The official remote sandbox endpoint is `https://mcp.sandbox.paypal.com/http`. Keep credentials out of source control.

## Render Workflows

`workflows/index.ts` defines placeholder workflow stages, but they are not currently used by the API or deployed by `render.yaml`.

## Sponsor integration notes

- AG Grid is used for the review workbench and donor analytics.
- Bryntum Scheduler Pro is not yet integrated. The fraud timeline is currently an HTML fallback.
- Channel3 uses a typed adapter with fallback data when credentials are unavailable; do not treat fallback as real shopping data.
- Render Workflows is a TypeScript stub, not yet a working asynchronous task pipeline.

## Demo flow

1. Create a task.
2. Fund it in PayPal sandbox or use demo funding mode.
3. Upload evidence.
4. Run verification.
5. Inspect the 9-check proof score.
6. Approve verified work.
7. Trigger a PayPal payout.
8. Simulate/replay a webhook.
9. Use the fraud timeline and natural-language review UI.

## Safety

Never put PayPal secrets or access tokens in the frontend. Never let an LLM directly decide to transfer funds without deterministic server-side eligibility checks and idempotency protection.

## Real AI + PayPal sandbox

This build uses real providers by default. Configure `AI_PROVIDER=gemini` or `AI_PROVIDER=openai` and supply the corresponding API key. PayPal runs in SANDBOX by default and requires your own Developer Dashboard Client ID/Secret. See `docs/SANDBOX-SETUP.md`.


> **Implementation warning:** This archive is a local diagnostic patch, not a fully tested deployment. See [docs/REPAIR-NOTES.md](docs/REPAIR-NOTES.md) for honest limitations and smoke tests. Do not enable real payouts without authentication, persistent evidence storage and verified funding.

# ProofPay repair notes (from the uploaded 2026-11-10 archive)

## Scope
This is a **diagnostic patch**, not a verified production deployment. It repairs the dashboard effect/type error, adds visible API/AI failures, loads the repository `.env` when running the API locally using Node 22+, makes the AI query endpoint invoke the configured LLM, wires an actual Leaflet map for GPS evidence, aligns the API TypeScript build output and Render port, and replaces the invalid Render service types. It prevents the old fake funding / fake payout success paths.

**Not implemented or externally verified:** PayPal Agent Toolkit/MCP execution; licensed Bryntum Scheduler Pro integration; durable Render Workflow execution; authentication/authorization; reliable cloud object storage for uploads; live external AI & PayPal operations. Do not use with real funds. The local `UPLOADS` folder is ephemeral on Render; use object storage for durable evidence before production.

## Local setup (Windows PowerShell; Node 22+)

1. In the repository root (`proofpay`), keep `.env` with your real credentials; do not commit it. Set `AI_PROVIDER=gemini` with `GOOGLE_API_KEY`, or `AI_PROVIDER=openai` with `OPENAI_API_KEY`.
2. `npm install`
3. `npm run db:generate`
4. For an existing database, keep your existing migrations; only run `npm run db:migrate` if you understand schema changes. Initial setup can use `npx prisma db push --schema prisma/schema.prisma`.
5. `npm run db:seed` (CAUTION: original seed **deletes demo funder tasks** on repeat; avoid repeating unless desired)
6. `npm run dev`
7. API health: http://localhost:4000/api/health. Web: http://localhost:5173.
8. Select an existing task row. Upload an image. Click Run verification. Ask the AI analyst a question. Review browser Network tab for `/api/agent/query` returning a `provider` and `model`.

## Single pass/fail smoke test

With both dev servers running, open another PowerShell window at the project root and run:

```powershell
npm run smoke
```

This exits with failure if the API, database, or live AI analyst does not work. It does **not** prove deployment, PayPal, MCP, or image verification.

## Quick smoke tests

Run the following in **another PowerShell terminal** while npm run dev is still running:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:4000/api/tasks | ConvertTo-Json -Depth 3
Invoke-RestMethod -Method POST -Uri http://localhost:4000/api/agent/query -ContentType 'application/json' -Body '{"query":"How many tasks need review?"}'
```

If AI key is absent or invalid, the third command should return an HTTP error **instead of a fake successful agent result**.

## Render

The new `render.yaml` deploys only API and static frontend (not workflows) and references a Render Postgres DB and service URL environment vars. Verify your account's free service/database eligibility and that the Blueprint validates before deploying. Configure the API's environment variables in Render. It will not reuse the PostgreSQL on your laptop. `preDeployCommand` runs `prisma db push` for initial prototyping; replace with committed migrations (`prisma migrate deploy`) for production. Do not turn on sandbox payouts until you implement authorization. `ENABLE_SANDBOX_PAYOUTS` stays false by default.

## Known limitations

- UI does not include a complete PayPal buyer approval and order capture flow. API exposes POST `/api/tasks/:id/fund` and POST `/api/tasks/:id/fund/capture`, but a proper checkout return URL and end-to-end funding UI still need work.
- The AI analyst uses live AI but does not yet call PayPal MCP or Agent Toolkit.
- No real PayPal/AI provider requests or npm compilation could be verified in this environment (package installation could not complete).
- Uploads remain on a local directory, not durable after Render restarts.
- The dashboard status header shows Sandbox even if PayPal keys are missing; check `/api/paypal/status`.

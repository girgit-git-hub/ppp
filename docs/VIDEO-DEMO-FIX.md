# ProofPay empty-dashboard fix — November 12, 2026

## Why the screen recording showed a blank dashboard

The database returned `[]` from `GET /api/tasks`. The previous React dashboard had no create-task UI, so it displayed zero rows and disabled its evidence uploader. The AI analyst did respond in the recording, but had no task records to consult. The Bryntum widget was a placeholder, and the map had no geotagged records.

## What this local-demo patch changes

- Adds a **Create a demo task** form (title, description, USD amount, optional reference product and planned site coordinates).
- Adds a **Load 2 example tasks** button that safely inserts missing demo tasks without deleting existing records.
- The API's two new routes, `POST /api/demo/tasks` and `POST /api/demo/bootstrap`, work **only when `NODE_ENV=development`**.
- Automatically selects the first task returned by the API so that the evidence uploader can be used. A newly created task is selected.
- Replaces the Bryntum placeholder with a basic real activity feed derived from database records; **does not** claim licensed Bryntum support.
- Allows the map to show planned task sites separately from GPS coordinates actually embedded in evidence photos. It does not fabricate GPS proof.
- Replaces destructive demo seeding (`deleteMany`) with safe non-destructive sample insertion.
- Corrects Prisma schema generator / datasource / enum formatting, with no intended table changes.
- Makes infrastructure smoke-test output clearly distinguish API/DB/AI checks from full product E2E verification.

## How to apply (Windows PowerShell in VS Code)

1. Stop `npm run dev` with Ctrl+C.
2. Back up your ProofPay folder. Keep its root `.env` file intact.
3. Download `proofpay_demo_workflow_fix_v2.zip`.
4. Open the terminal in the **actual project root** (`package.json` must be present).
5. Extract the ZIP into that project root, overwriting the matching files. For example, if the ZIP is in Downloads:
   ```powershell
   Expand-Archive "$env:USERPROFILE\Downloads\proofpay_demo_workflow_fix_v2.zip" -DestinationPath . -Force
   ```
6. Do not rerun database migrations, `db push`, or Prisma generation for this patch: no database columns were changed.
7. Restart:
   ```powershell
   npm run dev
   ```
8. Open `http://localhost:5173`. Click **Load 2 example tasks** or create your own task in the form.
9. Verify `http://localhost:4000/api/tasks` returns an array with tasks.
10. The first task should be selected automatically, and evidence upload enabled. Upload an actual JPG/PNG and run **Run verification**. The AI provider must be configured and may fail independently due to provider outages or quota.

If you do not apply the UI patch, and your local database genuinely has zero tasks, you can still populate it by running the original `npm run db:seed` once. Note: the **original** seed deletes existing tasks belonging to the demo funder before re-creating two tasks; the seed script in *this* patch no longer deletes data.

## Not completed or verified

- PayPal funding approval / capture UI, verified payout flow, and MCP/Agent Toolkit integrations.
- Bryntum Scheduler Pro licensed component.
- Durable file storage for cloud deployment.
- Auth/authorization controls for a public release.
- Render production deployment.

Source syntax was checked for the changed TypeScript/TSX files, but package installation, project builds, database calls, live uploads, and cloud deployment could not be completed in this offline patching environment. Only a real browser/API test with your credentials and PostgreSQL can validate the full workflow.

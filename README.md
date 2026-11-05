# OrderDesk

**One stock incident. Every affected order, a way forward.**

[Open the deployed demo](https://orderdesk-recovery.vercel.app)

OrderDesk is a supermarket order recovery prototype for Flip the Switch. When a picker discovers damaged or missing stock, it identifies all affected orders, allocates limited stock from another branch, reserves compatible replacements, and coordinates the human decisions needed to recover each order.

## Working now

- Responsive, multi-page website: overview, recovery center, orders, inventory, team activity, connection setup, and a detailed how-it-works page.
- Interactive browser-local demo with 20 products, two simulated branches, four departments, and eight sample orders.
- Incident-to-order impact analysis and a delivery-priority recovery planner.
- Reservation accounting: stock cannot be allocated twice; declining a replacement releases its reservation.
- Branch confirmation, manager expense approval, customer consent recording, packing, and dispatch gates.
- Declined replacements replan to a partial order with a proposed item refund.
- Timestamped decision history and downloadable JSON export.
- A server-side Switch WebSocket adapter and persistent local workspace service.
- Optional AI explanation of the recovery plan through the Vercel AI SDK / AI Gateway.

## Important implementation status

The public website starts in **demo mode**, uses sample data, and explicitly labels role simulation. It is not a live Switch connection. The demo planner is deterministic; it does not pretend to call an LLM.

The live integration code must be configured with an actual Switch deployment, a registered custom agent, room membership, staff participant IDs, and a persistent service host. It has protocol/mock integration tests, but has **not yet been verified against a real Switch server**. The AI explanation feature needs an AI Gateway key and a current model ID. Without them, it returns a labelled rules-based summary.

No customer messages, payments, refunds, real stock movements, or external supermarket systems are connected. “Ready to dispatch” records readiness, not proof of delivery. Monetary values are sample USD values. Value at risk is affected order value, not a claim of revenue saved.

## Run the demo

Requires Node.js 22 or later.

```sh
npm ci
npm test
npm run build
npm run dev
```

Open http://localhost:4173. No API keys are needed for the demo.

## Five-minute demonstration

1. Open the workspace. Report the default incident: four damaged `KT-01` kettles at Central.
2. Build the recovery plan. Four orders are affected. Two get Riverside transfers; two get replacement offers.
3. Open `OD-1041`. Simulate branch confirmation, manager approval of the $6 expense, packing, then release for dispatch.
4. Open `OD-1043`. Decline the replacement. Its reserved stock returns to Central, and its recovery path changes to partial fulfilment. Approve item removal and the proposed refund, pack, then release.
5. Recover the remaining affected orders. The incident closes only when all four are ready for dispatch. Export the activity trail.

## Why Switch matters

The intended live workflow starts and completes in a Switch room. Switch carries the staff stock report, branch confirmation, manager approval, customer-service consent recording, and dispatch updates to the recovery agent. OrderDesk verifies the sender’s exact participant ID before executing an action. The dashboard mirrors that persistent workspace read-only. It cannot bypass the Switch approval path.

Transport: current Switch WebSocket agent protocol, bearer authorization, persistent connection ID and cursor, ping/pong heartbeats, reconnect generation fencing, addressed-message handling, and HTTP message replies. The agent stops for a replay gap or takeover rather than silently continuing with incomplete context. Processed message IDs are persisted for idempotency. Human approvals use explicit commands and cannot be granted by AI-generated text.

See [Switch setup and live verification](docs/SWITCH_SETUP.md).

## Architecture

- `lib/engine.mjs`: shared deterministic recovery state machine and sample catalogue.
- `public/`: framework-free web UI. Demo data is isolated in localStorage.
- `server/store.mjs`: serialized transactions, durable JSON writes, revision checks, and message deduplication. Single service/agent instance only.
- `switch/agent.mjs`: long-running Switch WebSocket client. Run on the same persistent host as the service, not in a Vercel function.
- `switch/commands.mjs`: explicit command parser and sender authorization.
- `switch/ai.mjs`: optional AI explanation, with no write tools.
- `server/service.mjs`: authenticated read-only workspace API on the persistent host.
- `api/workspace.mjs`: Vercel read-only proxy. All live mutations go through Switch.

The local JSON store is suitable for a single-instance prototype. Multiple service replicas, production concurrency, commerce integrations, actual customer identity/consent, and enterprise access controls require further engineering. Do not publish real customer data through this public demo dashboard.

## Deploy to Vercel

Import this GitHub repository. Build command: `npm run build`. Output directory: `dist`. No framework preset is needed. `vercel.json` provides app routes and response headers.

For live read-only viewing, set `ORDERDESK_SERVICE_URL` (HTTPS) and `ORDERDESK_SERVICE_KEY` in Vercel. The matching key stays on the service host. Never put Switch or AI keys in browser code.

## Validation

`npm test` exercises impact analysis, limited stock allocation, reservations, approval gates, declined replacements, replay safety, identity permissions, and incident closure. `npm run build` creates the static distribution. A mock Switch test verifies the WebSocket/HTTP round trip separately from live deployment verification.

Built by **Avinthera Labs** · [GitHub](https://github.com/mikecity11/orderdesk)

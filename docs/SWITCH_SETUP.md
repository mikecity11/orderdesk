# Connect OrderDesk to a real Switch room

This guide connects the supplied implementation; it is not a claim that a live server is already configured.

## 1. Set up Switch

Follow the official [Switch quickstart](https://docs.switchagents.ai/switch-rooms/getting-started) and create an `order-recovery` room. Mattermost can be used for the team chat. Run the actual Switch server on a persistent machine. Vercel hosts OrderDesk’s website and read-only proxy; it does not host the long-running Switch server or agent.

Official protocol references:

- https://docs.switchagents.ai/switch-rooms/internals/agent-protocol
- https://docs.switchagents.ai/switch-rooms/internals/agent-connection
- https://docs.switchagents.ai/switch-rooms/internals/agent-events

The current protocol uses WebSocket events and HTTP replies. The hackathon overview’s older SSE description differs from the current docs; this adapter implements the current WebSocket transport.

## 2. Register once

Copy `.env.example` to a local `.env`. Configure the real server address and a Switch **registration key** locally, then run:

```sh
node --env-file=.env switch/register.mjs
```

The script saves the one-time agent credentials in ignored `.data/switch-registration.json` without printing them. Copy the returned `id` and `api_key` into `SWITCH_AGENT_ID` and `SWITCH_API_KEY` in your local `.env`. Never commit or share this file. A registration key cannot be used as an agent API key.

Invite the registered `orderdesk` agent to your room and set `SWITCH_ROOM_ID`. Set its addressing rules in Switch so the intended staff can address it; newly registered agents answer only their owner by default. Keep your Switch release’s own permissions in force.

## 3. Map exact staff identities

Inspect the participant IDs in your Switch room. `payload.sender` is an opaque ID. Map exact IDs, never display names:

```json
{
  "<central-picker-participant-id>": ["picker"],
  "<riverside-participant-id>": ["branch"],
  "<manager-participant-id>": ["manager"],
  "<customer-service-participant-id>": ["customer-service"],
  "<dispatch-participant-id>": ["dispatch"]
}
```

Save this JSON as the `ORDERDESK_STAFF_ROLES` value in the local environment. For a solo demonstration, your own exact participant ID may have all five roles; disclose that it is one person simulating the roles. Unknown participants cannot mutate or read the workspace through commands.

Customer-service approval is an explicit record of consent obtained by staff. There is no automatic customer chat integration. Never record approval without obtaining it.

## 4. Start the persistent components

Generate a random service secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and save it as `ORDERDESK_SERVICE_KEY`. Do not share the secret in chat.

In two terminals on the same host/check-out:

```sh
node --env-file=.env server/service.mjs
node --env-file=.env switch/agent.mjs
```

The service binds to localhost by default on port 8788. Run it behind an authenticated HTTPS reverse proxy or your chosen host’s HTTPS ingress; the bearer secret is still required. Set `HOST=0.0.0.0` only when your host requires it and your ingress/firewall is configured. Use persistent disk for `.data`; do not run multiple writers or replicas.

Agent credentials are kept on the service host. The agent uses `.data/switch-cursor.json` to resume its connection. It stops on takeover or missing event history; review the room and reconcile the workspace before deliberately replacing a checkpoint. Do not blindly delete a checkpoint to suppress a gap.

## 5. Optional AI explanation

The action workflow works with explicit commands and deterministic rules. To add actual AI explanations, configure `AI_GATEWAY_API_KEY` and `ORDERDESK_AI_MODEL` on the agent host. Choose a currently available `provider/model` ID from https://ai-gateway.vercel.sh/v1/models. No model ID or paid account is assumed by this repository.

The `explain` command passes a sample-data summary and the question through `generateText` from the installed `ai` package. It has no mutation tools and cannot approve a transfer or replacement. With no model configuration, it clearly returns a rules-based summary instead. Actual provider inference still requires a successful live test.

## 6. Exercise the live room

Mention the agent and issue these commands as the appropriate mapped identities:

```text
@orderdesk report KT-01 4 damaged stock confirmed during picking
@orderdesk plan
@orderdesk status
@orderdesk confirm OD-1041
@orderdesk approve-transfer OD-1041
@orderdesk pack OD-1041
@orderdesk dispatch OD-1041
@orderdesk decline-customer OD-1043
@orderdesk approve-customer OD-1043
@orderdesk pack OD-1043
@orderdesk dispatch OD-1043
@orderdesk explain Why did the first two orders receive transfers?
```

Repeat the required steps for OD-1042 and OD-1044 to close the incident. The `approve-customer` command approves the currently proposed replacement or partial order. Inspect the current plan before recording consent.

Verify that the room gets replies, `.data/workspace.json` changes, stock is reserved/released correctly, and unauthorized staff cannot approve another role’s task. Restart the agent and confirm an old message is not applied twice.

## 7. Connect the website

Set these Vercel environment variables and redeploy:

- `ORDERDESK_SERVICE_URL`: the HTTPS origin of the read-only service.
- `ORDERDESK_SERVICE_KEY`: the matching service secret.

Open Connections and choose **Check live connection**. The dashboard will show shared service data and refresh every five seconds; live approval controls are disabled. All changes go through Switch.

Use sample data in the publicly accessible dashboard. Real customer records need authentication and an appropriate access model before deployment.

## Before claiming a live Switch demo

Record at least one complete report → plan → staff confirmation → manager approval → pack → dispatch flow in the actual Switch chat. Also show a declined replacement replanning and releasing stock. A local browser demonstration or passing mock test alone does not verify real Switch connectivity.

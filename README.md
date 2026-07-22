# pr-legislative-x402

**Pay-per-call access to structured Puerto Rico legislative data, over the [x402](https://x402.org) agent-payment standard.**

An HTTP API + MCP server that lets AI agents search and read measures of the
Puerto Rico Legislative Assembly (Asamblea Legislativa) — and pay per call in
USDC on Base, autonomously, no accounts or API keys.

Data originates from OpenStates / SUTRA (public source); the value sold here is
the **cleaned, structured, topic-tagged, bilingual** layer that CivicaPR built
on top of it — the same corpus behind `civicapr.com/legislacion` (~4,900 measures).

> **Status:** scaffold. Runs end-to-end on built-in sample data with zero
> secrets. Wire it to the live Neon DB + a wallet to go paid.

---

## Why this exists (and why it protects the data, not exposes it)

The public site already serves this data free to any scraper. This project adds
a **separate, controlled, paid channel for machines** — which is strictly *more*
control than a public HTML page:

- **Read-only.** `DATABASE_URL` should point at a role with `SELECT` only. The
  code issues no writes.
- **Bounded responses.** Search returns summary rows capped at **25** (no
  abstract); full detail is a separate, pricier single-record call. Extracting
  the whole corpus therefore costs **per bill** — bulk scraping isn't cheap.
- **Neutral naming.** Given the live `CIVICA` trademark conflict, this package
  is deliberately *not* branded "Civica."
- **Free tier stays free.** The human site is untouched; this is an additive
  paid API tier for agents.

---

## Architecture

```
Agent (Claude Code / OpenClaw)
   │  calls MCP tools: search_pr_legislation, get_pr_bill
   ▼
MCP server  (src/mcp)  ── wraps fetch with wallet auto-pay (x402) ──┐
   │                                                                │ 402 → pay USDC on Base → retry
   ▼                                                                ▼
HTTP API  (src/server)  ── x402 payment gate ──▶ priced routes ──▶ Neon `bills` (read-only)
   free: /health, /v1/preview                                       └─ falls back to sample data
```

Payment layer is isolated in `src/server/x402.ts` (seller) and
`src/mcp/pay-fetch.ts` (buyer) so the young x402 SDK can churn without touching
the rest of the app.

---

## Quickstart (dev — no wallet, no DB)

```bash
npm install
npm test            # bounds + paywall-config tests, on sample data
npm run dev:server  # API on http://localhost:4021, payments OFF

# in another shell:
curl localhost:4021/v1/preview
curl 'localhost:4021/v1/bills/search?q=solar'
curl localhost:4021/v1/bills/PC%20456
```

Point an agent at the MCP server (payments off):

```bash
PR_X402_API_BASE=http://localhost:4021 npm run dev:mcp
```

## Endpoints

| Method | Path | Tier | Price* |
|---|---|---|---|
| GET | `/health` | free | — |
| GET | `/v1/preview` | free | — (corpus counts only) |
| GET | `/v1/bills/search?q=&chamber=&status=&limit=` | paid | `$0.01` |
| GET | `/v1/bills/:identifier` | paid | `$0.03` |

\*Prices live in one place: [`src/server/routes.ts`](src/server/routes.ts).

## Going paid (production)

1. **Point at real data** — create the read-only role with
   [`scripts/neon-readonly-role.sql`](scripts/neon-readonly-role.sql), then set
   `DATABASE_URL` to that role's **pooled** Neon connection string.
2. **Set your receiving wallet** — `RECEIVING_WALLET_ADDRESS` = a Base address
   you control. (This project never handles a *seller* private key; USDC settles
   on-chain to that address.)
3. **Enable + configure the facilitator** — `PAYMENTS_ENABLED=true`, plus the
   Coinbase CDP keys the facilitator needs (`CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`).
4. **Deploy** — see "Deploy" below.

> ⚠️ The x402 packages/versions in `package.json` (`@x402/express`, `@x402/fetch`,
> `@coinbase/cdp-sdk`) and the wiring in `x402.ts` / `pay-fetch.ts` are labeled
> **placeholders** — the ecosystem is weeks old and names have already shifted
> (`x402-express` → `@x402/express`). **Verify against the current
> [x402 docs](https://docs.cdp.coinbase.com/x402) before enabling.**

## Deploy

**Vercel (recommended for a data API).** All routes rewrite to one serverless
function (`api/index.ts`) that runs the same Express app. `vercel.json` is
included.

```bash
vercel                 # link + preview deploy
vercel --prod          # production
# set env in the dashboard (or `vercel env add`):
#   DATABASE_URL, PAYMENTS_ENABLED, RECEIVING_WALLET_ADDRESS,
#   X402_NETWORK, CDP_API_KEY_ID, CDP_API_KEY_SECRET
```

**Container / VPS / your own box.** A multi-stage [`Dockerfile`](Dockerfile) is
included:

```bash
docker build -t pr-legislative-x402 .
docker run -p 4021:4021 --env-file .env pr-legislative-x402
```

| Option | Good for | Notes |
|---|---|---|
| **Vercel** (serverless) | data API like this | Near-zero compute; reuses your existing stack. Recommended. |
| **Cheap VPS ($5/mo)** / Docker | always-on control | Fine; more ops than Vercel for no real gain here. |
| **Closet box** | selling *compute* (GPU/inference/transcription) | Only worth it when your marginal cost beats cloud. For a *data* API the box adds downtime/ISP risk with no upside — skip it here. |

## Use it from an agent (MCP)

Copy [`examples/claude-mcp-config.json`](examples/claude-mcp-config.json) into a
project `.mcp.json`, point `PR_X402_API_BASE` at your deployment, and (for a
paid server) set a dedicated low-balance `WALLET_PRIVATE_KEY`. Tools exposed:
`search_pr_legislation`, `get_pr_bill`.

## Quality gates

- `npm run typecheck` · `npm test` (17 tests) · `npm run build` — all run in CI
  ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) on push/PR.
- HTTP layer: zod-validated inputs (400 on bad query/identifier), JSON 404 +
  error handlers, CORS, security headers, and a best-effort rate limit on the
  free routes. API described in [`openapi.yaml`](openapi.yaml).

## Buyer side (agents that pay)

The MCP auto-pays only if `WALLET_PRIVATE_KEY` is set — use a **dedicated,
low-balance** Base key, never a treasury wallet. Unset = plain fetch, which
works against an open dev server.

---

## Layout

```
src/
  data/     schema.ts (types + zod inputs + limit clamp) · queries.ts (Neon, read-only) · mock.ts (sample corpus)
  server/   routes.ts (price config) · x402.ts (seller gate) · middleware.ts (cors/ratelimit/errors) · app.ts · index.ts
  mcp/      index.ts (tools) · pay-fetch.ts (buyer auto-pay)
api/        index.ts (Vercel serverless entry)
scripts/    neon-readonly-role.sql
examples/   claude-mcp-config.json
test/       bounds.test.ts · paywall.test.ts · validation.test.ts
openapi.yaml · vercel.json · Dockerfile · .github/workflows/ci.yml
```

MIT. Built by R21 Digital.

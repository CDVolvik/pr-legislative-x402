/**
 * End-to-end testnet smoke test: boots the REAL app with x402 payments ON
 * against Base Sepolia, then exercises the paid route.
 *
 *   - Always: an UNPAID request must return HTTP 402 with x402 payment
 *     requirements. This proves the seller middleware (@x402/express) is wired
 *     correctly — no funds needed.
 *   - If WALLET_PRIVATE_KEY is set (a funded base-sepolia key): a wrapped
 *     client must auto-pay and get 200 with data. This proves the full
 *     402 -> pay -> retry loop end to end.
 *
 * Nothing real is at risk: base-sepolia is play-money. Keep WALLET_PRIVATE_KEY
 * in a gitignored .env. This script never logs the key.
 *
 * Run:  npm run test:testnet
 */

// Set env BEFORE importing app code: x402.ts reads PAYMENTS_ENABLED at module
// load, and ESM hoists static imports above statements — so we set env here and
// dynamic-import below to guarantee ordering.
process.env.PAYMENTS_ENABLED ??= "true";
process.env.X402_NETWORK ??= "base-sepolia";
process.env.RECEIVING_WALLET_ADDRESS ??= "0x000000000000000000000000000000000000dEaD";

const { buildApp } = await import("../src/server/app.js");
const { makePayFetch } = await import("../src/mcp/pay-fetch.js");

const PORT = Number(process.env.PORT ?? 4055);
const BASE = `http://localhost:${PORT}`;
const PAID = `${BASE}/v1/bills/search?q=solar`;

let failed = false;
function check(ok: boolean, msg: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failed = true;
}

const app = await buildApp();
const server = app.listen(PORT);
await new Promise<void>((r) => server.once("listening", () => r()));
console.log(`testnet smoke on ${BASE} (network=${process.env.X402_NETWORK})\n`);

try {
  // 1) Unpaid request must be challenged with 402.
  const unpaid = await fetch(PAID);
  check(unpaid.status === 402, `unpaid request returns 402 (got ${unpaid.status})`);
  if (unpaid.status === 402) {
    const body = await unpaid.json().catch(() => ({}));
    console.log("      challenge:", JSON.stringify(body).slice(0, 400), "\n");
  }

  // 2) Paid leg — only runs when a funded testnet key is present.
  if (process.env.WALLET_PRIVATE_KEY?.trim()) {
    const payFetch = await makePayFetch();
    const paid = await payFetch(PAID);
    check(paid.status === 200, `paid request returns 200 (got ${paid.status})`);
    if (paid.status === 200) console.log("      data:", (await paid.text()).slice(0, 200));
  } else {
    console.log("SKIP  paid leg — set WALLET_PRIVATE_KEY (a funded base-sepolia key) in .env to run it");
  }
} catch (err) {
  check(false, `threw: ${(err as Error).message}`);
} finally {
  server.close();
}

process.exit(failed ? 1 : 0);

/**
 * Buyer-side fetch. If WALLET_PRIVATE_KEY is set, wrap fetch so it auto-pays
 * x402 402-challenges from that wallet; otherwise return plain fetch (works
 * against an open / PAYMENTS_ENABLED=false server).
 *
 * Wiring matches the REAL x402-fetch@1.x API (verified against its type defs):
 *   createSigner(network, privateKey) -> Signer
 *   wrapFetchWithPayment(fetch, signer, maxValue?) -> fetch
 * x402-fetch caps spend at 0.10 USDC/request by default — a built-in guardrail.
 *
 * The wallet key is read once here and never logged. Use a dedicated,
 * low-balance Base key for agents — never a treasury wallet. Loaded via dynamic
 * import + `any` so this builds without the SDK installed.
 */
export async function makePayFetch(): Promise<typeof fetch> {
  const pk = process.env.WALLET_PRIVATE_KEY?.trim();
  if (!pk) return fetch;

  const network = process.env.X402_NETWORK ?? "base";
  const x402: any = await import("x402-fetch");
  const signer = await x402.createSigner(network, pk);
  return x402.wrapFetchWithPayment(fetch, signer) as typeof fetch;
}

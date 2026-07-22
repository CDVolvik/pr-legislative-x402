/**
 * Buyer-side fetch. If WALLET_PRIVATE_KEY is set, wrap fetch so it auto-pays
 * x402 402-challenges from that wallet; otherwise return plain fetch (works
 * against an open / PAYMENTS_ENABLED=false server).
 *
 * The wallet key is read ONCE here and never logged. Use a dedicated,
 * low-balance Base key for agents — never a treasury wallet.
 *
 * SDK loaded via runtime string specifiers + `any` so this typechecks/builds
 * without x402-fetch/viem installed. Verify against current x402 docs before
 * relying on it in production.
 */
export async function makePayFetch(): Promise<typeof fetch> {
  const pk = process.env.WALLET_PRIVATE_KEY?.trim();
  if (!pk) return fetch;

  const fetchPkg: string = process.env.X402_FETCH_PKG ?? "x402-fetch";
  const viemPkg: string = "viem/accounts";
  const x402: any = await import(fetchPkg);
  const viem: any = await import(viemPkg);

  const account = viem.privateKeyToAccount(pk as `0x${string}`);
  return x402.wrapFetchWithPayment(fetch, account) as typeof fetch;
}

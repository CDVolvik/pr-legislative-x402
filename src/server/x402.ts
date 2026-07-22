import type { Express } from "express";
import { PRICED_ROUTES } from "./routes.js";

/**
 * Isolated x402 payment layer. EVERYTHING payment-SDK-specific lives here so
 * the rest of the app stays stable while the young x402 ecosystem churns.
 * (There are already two package families in the wild: `@x402/express` @ 2.x
 * and unscoped `x402-express`/`x402-fetch` @ 1.x — hence the env overrides.)
 *
 * Two modes:
 *   PAYMENTS_ENABLED != "true"  -> endpoints are OPEN. No wallet/SDK needed.
 *                                  Default for dev, tests, demos.
 *   PAYMENTS_ENABLED == "true"  -> real per-call charging via x402 on Base.
 *
 * The SDK is loaded via a *runtime* string specifier + `any`, on purpose: the
 * scaffold typechecks and builds without the package installed, and you can
 * swap package/API when you flip payments on. VERIFY the middleware signature
 * against current docs (https://docs.cdp.coinbase.com/x402) before going live.
 */
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

export async function applyPaymentGate(app: Express): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    console.warn(
      "[x402] PAYMENTS_ENABLED != true — endpoints are OPEN (dev mode). No wallet or facilitator required.",
    );
    return;
  }

  const payTo = process.env.RECEIVING_WALLET_ADDRESS;
  if (!payTo) {
    throw new Error("RECEIVING_WALLET_ADDRESS is required when PAYMENTS_ENABLED=true");
  }

  // Runtime specifier (typed string) → TS won't resolve/typecheck it here.
  const sellerPkg: string = process.env.X402_SELLER_PKG ?? "@x402/express";
  const x402: any = await import(sellerPkg);

  // Classic seller signature: paymentMiddleware(payTo, routes, facilitator?).
  // On mainnet the facilitator needs Coinbase CDP creds; on *-sepolia it's free.
  const facilitator =
    process.env.X402_NETWORK?.includes("sepolia") ? undefined : { url: "https://x402.org/facilitator" };

  app.use(x402.paymentMiddleware(payTo, PRICED_ROUTES, facilitator));
  console.log(
    `[x402] Payments ENABLED via ${sellerPkg} — settling to ${payTo} on ${process.env.X402_NETWORK ?? "base"}`,
  );
}

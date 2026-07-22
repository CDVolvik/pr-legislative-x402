import type { Express } from "express";
import { PRICED_ROUTES } from "./routes.js";

/**
 * Isolated x402 payment layer (seller side). All payment-SDK specifics live
 * here so the rest of the app is insulated from the young, churning ecosystem.
 *
 * Wiring below matches the REAL installed API of @x402/express@2.x (verified
 * against its type defs), not a guess:
 *   - RoutesConfig = Record<"<METHOD> <path>", { payTo, price, network }>
 *   - paymentMiddlewareFromConfig(routes, facilitator?) -> express middleware
 *   - Testnet (base-sepolia) uses the free default facilitator; mainnet uses
 *     the Coinbase facilitator from @coinbase/x402 (needs CDP_API_KEY_* env).
 *
 * Loaded via dynamic import + `any` so the app still typechecks/builds without
 * the SDK, and only pulls it in when PAYMENTS_ENABLED=true. The one thing types
 * can't prove is a live settlement — CERTIFY on Base Sepolia before mainnet
 * (see README "Make it live").
 *
 * Modes:
 *   PAYMENTS_ENABLED != "true"  -> endpoints OPEN (dev/test/demo). No wallet.
 *   PAYMENTS_ENABLED == "true"  -> per-call charging via x402.
 */
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

/** Build the SDK-shaped RoutesConfig from our price table + runtime payTo/network. */
export function buildX402Routes(payTo: string, network: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(PRICED_ROUTES).map(([pattern, cfg]) => [
      pattern,
      { payTo, price: cfg.price, network },
    ]),
  );
}

export async function applyPaymentGate(app: Express): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    console.warn(
      "[x402] PAYMENTS_ENABLED != true — endpoints are OPEN (dev mode). No wallet or facilitator required.",
    );
    return;
  }

  const payTo = process.env.RECEIVING_WALLET_ADDRESS;
  if (!payTo) throw new Error("RECEIVING_WALLET_ADDRESS is required when PAYMENTS_ENABLED=true");

  const network = process.env.X402_NETWORK ?? "base";
  const isTestnet = network.includes("sepolia");
  const routes = buildX402Routes(payTo, network);

  const x402: any = await import("@x402/express");
  let middleware;
  if (isTestnet) {
    // Free public facilitator on testnet — no CDP creds needed.
    middleware = x402.paymentMiddlewareFromConfig(routes);
  } else {
    // Mainnet: Coinbase facilitator (reads CDP_API_KEY_ID / CDP_API_KEY_SECRET).
    const coinbase: any = await import("@coinbase/x402");
    middleware = x402.paymentMiddlewareFromConfig(routes, coinbase.facilitator);
  }

  app.use(middleware);
  console.log(`[x402] Payments ENABLED — settling to ${payTo} on ${network}${isTestnet ? " (testnet)" : ""}`);
}

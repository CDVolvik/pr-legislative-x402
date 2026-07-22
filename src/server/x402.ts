import type { Express } from "express";
import { PRICED_ROUTES } from "./routes.js";

/**
 * Isolated x402 payment layer (seller side). All payment-SDK specifics live
 * here so the rest of the app is insulated from the young, churning ecosystem.
 *
 * Wiring matches the canonical @x402/express@2.x quick-start (verified against
 * the package README + its resource-server source):
 *   - build an x402ResourceServer(facilitatorClient).register(<caip2>, ExactEvmScheme)
 *   - routes are { "<METHOD> <path>": { accepts: { scheme:"exact", price, network, payTo }, description } }
 *   - network is CAIP-2 ("eip155:8453" = Base, "eip155:84532" = Base Sepolia)
 *   - testnet uses the free public facilitator; mainnet uses @coinbase/x402
 *
 * SDK modules are pulled via runtime string specifiers + `any` so the app still
 * typechecks/builds without them, and only loads them when PAYMENTS_ENABLED=true.
 * Types can't prove a live settlement — CERTIFY on Base Sepolia (see TESTNET.md).
 *
 * Modes:
 *   PAYMENTS_ENABLED != "true"  -> endpoints OPEN (dev/test/demo). No wallet.
 *   PAYMENTS_ENABLED == "true"  -> per-call charging via x402.
 */
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

/** Human network name -> CAIP-2 chain id used by the x402 EVM scheme. */
const CAIP2: Record<string, string> = {
  base: "eip155:8453",
  "base-sepolia": "eip155:84532",
};

export function toCaip2(network: string): string {
  return CAIP2[network] ?? network;
}

/** Build the SDK-shaped RoutesConfig (accepts wrapper) from our price table. */
export function buildX402Routes(payTo: string, caip2Network: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(PRICED_ROUTES).map(([pattern, cfg]) => [
      pattern,
      {
        accepts: { scheme: "exact", price: cfg.price, network: caip2Network, payTo },
        description: cfg.description,
      },
    ]),
  );
}

export async function applyPaymentGate(app: Express): Promise<void> {
  if (process.env.PAYMENTS_ENABLED !== "true") {
    console.warn(
      "[x402] PAYMENTS_ENABLED != true — endpoints are OPEN (dev mode). No wallet or facilitator required.",
    );
    return;
  }

  const payTo = process.env.RECEIVING_WALLET_ADDRESS;
  if (!payTo) throw new Error("RECEIVING_WALLET_ADDRESS is required when PAYMENTS_ENABLED=true");

  const network = process.env.X402_NETWORK ?? "base";
  const caip2 = toCaip2(network);
  const isTestnet = network.includes("sepolia");

  // Runtime string specifiers (typed string) so typecheck never depends on these.
  const expressPkg: string = "@x402/express";
  const evmPkg: string = "@x402/evm/exact/server";
  const corePkg: string = "@x402/core/server";
  const { paymentMiddleware, x402ResourceServer } = (await import(expressPkg)) as any;
  const { ExactEvmScheme } = (await import(evmPkg)) as any;
  const { HTTPFacilitatorClient } = (await import(corePkg)) as any;

  let facilitatorClient: any;
  if (isTestnet) {
    facilitatorClient = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
  } else {
    const coinbasePkg: string = "@coinbase/x402";
    const { facilitator } = (await import(coinbasePkg)) as any; // reads CDP_API_KEY_* env
    facilitatorClient = new HTTPFacilitatorClient(facilitator);
  }

  const resourceServer = new x402ResourceServer(facilitatorClient).register(caip2, new ExactEvmScheme());
  app.use(paymentMiddleware(buildX402Routes(payTo, caip2), resourceServer));

  console.log(`[x402] Payments ENABLED — settling to ${payTo} on ${network} (${caip2})${isTestnet ? " [testnet]" : ""}`);
}

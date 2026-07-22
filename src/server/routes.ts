/**
 * Single source of truth for what each priced endpoint costs. Consumed by the
 * x402 payment gate AND documented in the README, so price and paywall never
 * drift apart.
 *
 * Design note (the "protect, don't hurt" bit): search is cheap and bounded;
 * full-record detail is where the value + price sits. This makes bulk
 * extraction pay-per-bill instead of one-cheap-call-scrapes-everything.
 */
export const PRICED_ROUTES = {
  "GET /v1/bills/search": {
    price: "$0.01",
    network: "base",
    description: "Search Puerto Rico legislative measures. Summary rows only, max 25.",
  },
  "GET /v1/bills/:identifier": {
    price: "$0.03",
    network: "base",
    description: "Full measure detail: abstract, sponsors, and action history.",
  },
} as const;

export type PricedRoute = keyof typeof PRICED_ROUTES;

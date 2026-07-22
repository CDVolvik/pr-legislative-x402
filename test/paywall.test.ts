import { describe, it, expect } from "vitest";
import { PRICED_ROUTES } from "../src/server/routes.js";
import { applyPaymentGate, PAYMENTS_ENABLED } from "../src/server/x402.js";

describe("priced-route config integrity", () => {
  it("every priced route declares a USD price and Base network", () => {
    for (const [route, cfg] of Object.entries(PRICED_ROUTES)) {
      expect(route, `${route} method+path`).toMatch(/^GET \/v1\//);
      expect(cfg.price, `${route} price`).toMatch(/^\$\d/);
      expect(cfg.network, `${route} network`).toBe("base");
      expect(cfg.description.length).toBeGreaterThan(10);
    }
  });

  it("detail is priced above search (bulk extraction stays pay-per-record)", () => {
    const cents = (p: string) => Math.round(parseFloat(p.replace("$", "")) * 100);
    expect(cents(PRICED_ROUTES["GET /v1/bills/:identifier"].price)).toBeGreaterThan(
      cents(PRICED_ROUTES["GET /v1/bills/search"].price),
    );
  });
});

describe("payment gate in dev mode", () => {
  it("defaults to OFF so the stack runs with no wallet", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
  });

  it("is a no-op that requires no x402 SDK when disabled", async () => {
    const used: string[] = [];
    const fakeApp = { use: (fn: unknown) => used.push(String(typeof fn)) } as any;
    await expect(applyPaymentGate(fakeApp)).resolves.toBeUndefined();
    expect(used).toHaveLength(0); // no middleware registered
  });
});

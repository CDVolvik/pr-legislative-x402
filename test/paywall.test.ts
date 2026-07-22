import { describe, it, expect } from "vitest";
import { PRICED_ROUTES } from "../src/server/routes.js";
import { applyPaymentGate, PAYMENTS_ENABLED, buildX402Routes, toCaip2 } from "../src/server/x402.js";

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

describe("toCaip2 (network name -> chain id)", () => {
  it("maps Base + Base Sepolia to CAIP-2", () => {
    expect(toCaip2("base")).toBe("eip155:8453");
    expect(toCaip2("base-sepolia")).toBe("eip155:84532");
  });
  it("passes through an already-CAIP-2 value", () => {
    expect(toCaip2("eip155:8453")).toBe("eip155:8453");
  });
});

describe("buildX402Routes (SDK-shaped RoutesConfig)", () => {
  it("wraps every priced route in { accepts: { scheme, price, network, payTo } }", () => {
    const routes = buildX402Routes("0xabc", "eip155:8453") as Record<string, any>;
    expect(Object.keys(routes)).toEqual(Object.keys(PRICED_ROUTES));
    for (const [pattern, cfg] of Object.entries(routes)) {
      expect(cfg.accepts.scheme).toBe("exact");
      expect(cfg.accepts.payTo).toBe("0xabc");
      expect(cfg.accepts.network).toBe("eip155:8453");
      expect(cfg.accepts.price).toBe((PRICED_ROUTES as any)[pattern].price);
    }
  });

  it("propagates the chosen CAIP-2 network (e.g. testnet)", () => {
    const routes = buildX402Routes("0xabc", "eip155:84532") as Record<string, any>;
    expect(Object.values(routes).every((c: any) => c.accepts.network === "eip155:84532")).toBe(true);
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

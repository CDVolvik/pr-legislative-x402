import express, { type Express, type Request, type Response } from "express";
import { searchBills, getBill, corpusStats, usingLiveData } from "../data/queries.js";
import { SearchInput, GetBillInput } from "../data/schema.js";
import { applyPaymentGate } from "./x402.js";
import { cors, securityHeaders, rateLimit, notFound, errorHandler } from "./middleware.js";

/**
 * Builds the HTTP API. Route order matters: the payment gate is applied BEFORE
 * the priced routes so a 402 is returned before any data query runs.
 *
 * Free routes (no gate, rate-limited): GET /health, GET /v1/preview.
 * Priced routes (x402-gated, validated): GET /v1/bills/search, /v1/bills/:identifier.
 */
export async function buildApp(): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind Vercel/any proxy: use X-Forwarded-For for req.ip

  app.use(cors);
  app.use(securityHeaders);

  const freeLimiter = rateLimit({ windowMs: 60_000, max: 60 });

  // ── Free routes ──────────────────────────────────────────────────────────
  app.get("/health", freeLimiter, (_req: Request, res: Response) => {
    res.json({ ok: true, liveData: usingLiveData });
  });

  // Unpaid teaser — corpus counts only, leaks no records.
  app.get("/v1/preview", freeLimiter, async (_req: Request, res: Response) => {
    res.json({
      dataset: "Puerto Rico — Asamblea Legislativa (medidas)",
      source: "OpenStates / SUTRA (OSLPR)",
      stats: await corpusStats(),
      paid_endpoints: {
        search: "GET /v1/bills/search?q=&chamber=&status=&limit=",
        detail: "GET /v1/bills/:identifier",
      },
    });
  });

  // ── Payment gate (no-op unless PAYMENTS_ENABLED=true) ─────────────────────
  await applyPaymentGate(app);

  // ── Priced routes (validated) ─────────────────────────────────────────────
  app.get("/v1/bills/search", async (req: Request, res: Response) => {
    const parsed = SearchInput.safeParse({
      query: req.query.q || undefined,
      chamber: req.query.chamber || undefined,
      status: req.query.status || undefined,
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    });
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
      return;
    }
    const rows = await searchBills({
      q: parsed.data.query,
      chamber: parsed.data.chamber,
      status: parsed.data.status,
      limit: parsed.data.limit,
    });
    res.json({ count: rows.length, results: rows });
  });

  app.get("/v1/bills/:identifier", async (req: Request, res: Response) => {
    const parsed = GetBillInput.safeParse({ identifier: req.params.identifier });
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_identifier", details: parsed.error.flatten() });
      return;
    }
    const bill = await getBill(parsed.data.identifier);
    if (!bill) {
      res.status(404).json({ error: "not_found", identifier: parsed.data.identifier });
      return;
    }
    res.json(bill);
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

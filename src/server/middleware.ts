import type { Request, Response, NextFunction } from "express";

/** Permissive CORS for a public GET-only data API. Allows the x402 payment headers. */
export function cors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Minimal security headers (no external dep). */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

/**
 * Best-effort in-memory fixed-window rate limiter for the FREE routes.
 * NOTE: per-instance only — on serverless (Vercel) each warm instance keeps its
 * own window, so this blunts casual abuse but is not a hard global cap. For that,
 * back it with a shared store (Upstash/Redis). Paid routes are metered by x402.
 */
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.reset < now) {
      e = { count: 0, reset: now + opts.windowMs };
      hits.set(key, e);
    }
    e.count++;
    if (e.count > opts.max) {
      res.setHeader("Retry-After", String(Math.ceil((e.reset - now) / 1000)));
      res.status(429).json({ error: "rate_limited", retry_after_s: Math.ceil((e.reset - now) / 1000) });
      return;
    }
    next();
  };
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found" });
}

// Express 5 forwards rejected async handlers here. 4-arg signature is required.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error("[error]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error" });
}

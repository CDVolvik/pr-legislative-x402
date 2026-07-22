import { z } from "zod";

/**
 * Shapes returned to buyers. Deliberately TIERED so the paid API stays a
 * sensible product instead of a free-scrape target:
 *
 *  - Search returns SUMMARY rows only (no abstract, capped at 25). Cheap, bounded.
 *  - Full detail (abstract + sponsors + action history) is a separate, pricier
 *    single-record call. Extracting the whole corpus therefore costs per-bill,
 *    which is the point.
 */
export interface BillSummary {
  identifier: string;
  chamber: string | null;
  status: string | null;
  title: string;
  topics: string[];
  latest_action_date: string | null;
}

export interface BillDetail extends BillSummary {
  session: string | null;
  classification: string[];
  abstract: string | null;
  subjects: string[];
  sponsors: { name: string; is_primary: boolean; classification: string | null }[];
  actions: { date: string | null; description: string; classification: string[] }[];
  sutra_url: string | null;
}

/** Hard ceiling on search results — cheaper than the public site's 100/200 on purpose. */
export const MAX_SEARCH_LIMIT = 25;

export function clampLimit(n: number | undefined): number {
  if (n === undefined || Number.isNaN(n) || n < 1) return 10;
  return Math.min(Math.trunc(n), MAX_SEARCH_LIMIT);
}

// ── MCP tool input schemas (validated; DB rows are mapped, not validated) ──
export const SearchInput = z.object({
  query: z.string().trim().min(1).optional().describe("Free text matched against bill title or identifier (e.g. 'cannabis', 'PC 456')."),
  chamber: z.enum(["upper", "lower"]).optional().describe("upper = Senado, lower = Cámara de Representantes."),
  status: z.string().trim().min(1).optional().describe("Filter by status slug, e.g. 'ley', 'aprobada', 'radicada'."),
  limit: z.number().int().positive().max(MAX_SEARCH_LIMIT).optional().describe(`Max rows (1-${MAX_SEARCH_LIMIT}).`),
});

export const GetBillInput = z.object({
  identifier: z.string().trim().min(2).describe("Bill identifier, e.g. 'PC 456' or 'ps-123'."),
});

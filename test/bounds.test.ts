import { describe, it, expect } from "vitest";
import { clampLimit, MAX_SEARCH_LIMIT } from "../src/data/schema.js";
import { searchBills, getBill } from "../src/data/queries.js";

describe("clampLimit (anti-bulk-scrape ceiling)", () => {
  it("defaults to 10 when unset or invalid", () => {
    expect(clampLimit(undefined)).toBe(10);
    expect(clampLimit(NaN)).toBe(10);
    expect(clampLimit(0)).toBe(10);
    expect(clampLimit(-5)).toBe(10);
  });

  it(`never exceeds MAX_SEARCH_LIMIT (${MAX_SEARCH_LIMIT})`, () => {
    expect(clampLimit(1000)).toBe(MAX_SEARCH_LIMIT);
    expect(clampLimit(MAX_SEARCH_LIMIT + 1)).toBe(MAX_SEARCH_LIMIT);
  });

  it("passes through valid in-range values (truncating floats)", () => {
    expect(clampLimit(5)).toBe(5);
    expect(clampLimit(7.9)).toBe(7);
  });
});

describe("searchBills (summary tier — no abstract leak)", () => {
  it("returns bounded summary rows on sample data", async () => {
    const rows = await searchBills({ limit: 999 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(MAX_SEARCH_LIMIT);
    for (const r of rows) {
      // Summary tier must NOT include the paid full-record fields.
      expect(r).not.toHaveProperty("abstract");
      expect(r).not.toHaveProperty("sponsors");
      expect(r).toHaveProperty("identifier");
      expect(r).toHaveProperty("title");
    }
  });

  it("filters by text query", async () => {
    const rows = await searchBills({ q: "solar" });
    expect(rows.every((r) => /solar/i.test(`${r.title} ${r.identifier}`))).toBe(true);
  });
});

describe("getBill (detail tier)", () => {
  it("returns full detail incl. sponsors + actions for a known id", async () => {
    const bill = await getBill("PC 456");
    expect(bill).not.toBeNull();
    expect(bill!.abstract).toBeTruthy();
    expect(Array.isArray(bill!.sponsors)).toBe(true);
    expect(Array.isArray(bill!.actions)).toBe(true);
  });

  it("normalizes dashed identifiers (ps-123 -> PS 123)", async () => {
    const bill = await getBill("ps-123");
    expect(bill?.identifier).toBe("PS 123");
  });

  it("returns null for unknown id", async () => {
    expect(await getBill("ZZ 999")).toBeNull();
  });
});

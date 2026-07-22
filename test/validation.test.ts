import { describe, it, expect } from "vitest";
import { SearchInput, GetBillInput, MAX_SEARCH_LIMIT } from "../src/data/schema.js";

describe("SearchInput validation", () => {
  it("accepts an empty query (all filters optional)", () => {
    expect(SearchInput.safeParse({}).success).toBe(true);
  });

  it("rejects limit above the ceiling", () => {
    expect(SearchInput.safeParse({ limit: MAX_SEARCH_LIMIT + 1 }).success).toBe(false);
  });

  it("rejects an unknown chamber", () => {
    expect(SearchInput.safeParse({ chamber: "senate" }).success).toBe(false);
    expect(SearchInput.safeParse({ chamber: "upper" }).success).toBe(true);
  });

  it("rejects a non-integer limit", () => {
    expect(SearchInput.safeParse({ limit: 3.5 }).success).toBe(false);
  });
});

describe("GetBillInput validation", () => {
  it("requires an identifier of at least 2 chars", () => {
    expect(GetBillInput.safeParse({ identifier: "x" }).success).toBe(false);
    expect(GetBillInput.safeParse({ identifier: "PC 456" }).success).toBe(true);
  });
});

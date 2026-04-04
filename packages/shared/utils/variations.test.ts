import { describe, expect, it } from "vitest";
import {
  buildTrackSearchQueries,
  generateAliasQueries,
  normalizeSearchQuery,
  shouldUseFallback,
} from "./variations";

describe("normalizeSearchQuery", () => {
  it("normalizes punctuation-heavy titles and connector aliases", () => {
    expect(normalizeSearchQuery("FE!N")).toBe("fein");
    expect(normalizeSearchQuery("Drake ft Lil Wayne")).toBe(
      "drake feat lil wayne"
    );
    expect(normalizeSearchQuery("R&B Mix")).toBe("rnb mix");
  });

  it("does not expand ambiguous short inputs", () => {
    expect(normalizeSearchQuery("dr")).toBe("dr");
    expect(generateAliasQueries("dr")).toEqual([]);
  });
});

describe("buildTrackSearchQueries", () => {
  it("adds a stylized alias query for punctuation-insensitive misses", () => {
    expect(buildTrackSearchQueries("fein")).toEqual({
      originalQuery: "fein",
      canonicalQuery: undefined,
      aliasQueries: ["fe!n"],
    });
  });

  it("builds canonical and alias queries for connector and slang cases", () => {
    expect(buildTrackSearchQueries("Drake ft Lil Wayne")).toEqual({
      originalQuery: "Drake ft Lil Wayne",
      canonicalQuery: "drake feat lil wayne",
      aliasQueries: ["drake featuring lil wayne", "drake feat little wayne"],
    });
    expect(buildTrackSearchQueries("Big Dogs")).toEqual({
      originalQuery: "Big Dogs",
      canonicalQuery: undefined,
      aliasQueries: ["big dawgs"],
    });
  });
});

describe("shouldUseFallback", () => {
  it("uses the narrower v2 threshold by default", () => {
    expect(shouldUseFallback(0)).toBe(true);
    expect(shouldUseFallback(4)).toBe(true);
    expect(shouldUseFallback(5)).toBe(false);
  });
});

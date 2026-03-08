import { describe, it, expect } from "vitest";
import { getCoverUrl, getCoverUrlBySize } from "./utils";

describe("getCoverUrl", () => {
  it("should return empty string when coverId is undefined", () => {
    expect(getCoverUrl(undefined)).toBe("");
    expect(getCoverUrl(undefined, "320")).toBe("");
  });

  it("should return empty string when coverId is null", () => {
    expect(getCoverUrl(null as any)).toBe("");
  });

  it("should return formatted URL with default size", () => {
    const result = getCoverUrl("abc-123-def");
    expect(result).toBe("https://resources.tidal.com/images/abc/123/def/320x320.jpg");
  });

  it("should return formatted URL with custom size", () => {
    const result = getCoverUrl("abc-123-def", "160");
    expect(result).toBe("https://resources.tidal.com/images/abc/123/def/160x160.jpg");
  });

  it("should handle numeric cover IDs", () => {
    const result = getCoverUrl(123456789);
    expect(result).toBe("https://resources.tidal.com/images/123456789/320x320.jpg");
  });
});

describe("getCoverUrlBySize", () => {
  it("should return URL with 320 size by default", () => {
    expect(getCoverUrlBySize("test")).toBe("https://resources.tidal.com/images/test/320x320.jpg");
  });

  it("should return URL with specified size", () => {
    expect(getCoverUrlBySize("test", "640")).toBe("https://resources.tidal.com/images/test/640x640.jpg");
    expect(getCoverUrlBySize("test", "1280")).toBe("https://resources.tidal.com/images/test/1280x1280.jpg");
  });
});

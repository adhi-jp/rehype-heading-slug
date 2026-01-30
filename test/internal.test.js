import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Internal implementation details", () => {
  describe("Unicode normalization behavior", () => {
    it("does not normalize converted invalid explicit slugs when normalizeUnicode is enabled", async () => {
      const input = "<h1>Title {#caf\u00e9 slug!}</h1>";
      const result = await processHtml(input, {
        invalidSlugHandling: "convert",
        normalizeUnicode: true,
      });
      expect(result).toContain('id="caf\u00e9-slug"');
      expect(result).not.toContain('id="cafe-slug"');
    });
  });
});

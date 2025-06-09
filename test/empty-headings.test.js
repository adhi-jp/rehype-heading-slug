import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Empty heading handling", () => {
  describe("assignIdToEmptyHeading option", () => {
    it("assigns fallback id when option is enabled", async () => {
      const input = "<h1></h1>";
      const result = await processHtml(input, { assignIdToEmptyHeading: true });
      expect(result).toContain('id="h1-1"');
    });

    it("ignores empty headings by default", async () => {
      const input = "<h1></h1>";
      const result = await processHtml(input, {
        assignIdToEmptyHeading: false,
      });
      expect(result).not.toContain("id=");
    });

    it("assigns fallback id to whitespace-only headings when trimWhitespace is disabled", async () => {
      const input = "<h1>   </h1>";
      const result = await processHtml(input, {
        trimWhitespace: false,
        assignIdToEmptyHeading: true,
      });
      expect(result).toContain('id="h1-1"');
    });
  });

  describe("trimWhitespace interaction", () => {
    it("processes normal content when trimWhitespace is disabled", async () => {
      const input = "<h1>actual content</h1>";
      const result = await processHtml(input, { trimWhitespace: false });
      expect(result).toContain('id="actual-content"');
    });
  });
});

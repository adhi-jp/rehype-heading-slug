import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";
import rehypeHeadingSlug from "rehype-heading-slug";

describe("Error handling", () => {
  describe("Runtime errors", () => {
    it("throws error for duplicate slugs when duplicateSlugHandling is 'error'", async () => {
      const input = "<h1>Same Title</h1><h2>Same Title</h2>";
      await expect(
        processHtml(input, { duplicateSlugHandling: "error" }),
      ).rejects.toThrow("Duplicate slug found");
    });

    it("throws error for invalid explicit slugs when invalidSlugHandling is 'error'", async () => {
      const input = "<h1>Title {#invalid slug!}</h1>";
      await expect(
        processHtml(input, { invalidSlugHandling: "error" }),
      ).rejects.toThrow("Invalid explicit slug notation found");
    });

    it("converts invalid explicit slugs by default", async () => {
      const input = "<h1>Title {#invalid slug!}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="invalid-slug"');
      expect(result).toContain(">Title</h1>");
    });
  });

  describe("Option validation errors", () => {
    it("throws TypeError for non-object options", async () => {
      expect(() => rehypeHeadingSlug(123)).toThrow(TypeError);
      expect(() => rehypeHeadingSlug("str")).toThrow(TypeError);
    });

    it("throws TypeError for invalid slugRegex", async () => {
      expect(() => rehypeHeadingSlug({ slugRegex: 123 })).toThrow(TypeError);
      expect(() => rehypeHeadingSlug({ slugRegex: "abc" })).toThrow(TypeError);
    });

    it("throws TypeError for invalid maintainCase", async () => {
      expect(() => rehypeHeadingSlug({ maintainCase: "true" })).toThrow(
        TypeError,
      );
      expect(() => rehypeHeadingSlug({ maintainCase: 1 })).toThrow(TypeError);
    });

    it("throws TypeError for invalid duplicateSlugHandling", async () => {
      expect(() => rehypeHeadingSlug({ duplicateSlugHandling: "foo" })).toThrow(
        TypeError,
      );
    });

    it("throws TypeError for invalid invalidSlugHandling", async () => {
      expect(() => rehypeHeadingSlug({ invalidSlugHandling: "foo" })).toThrow(
        TypeError,
      );
    });

    it("throws TypeError for invalid normalizeUnicode", async () => {
      expect(() => rehypeHeadingSlug({ normalizeUnicode: "true" })).toThrow(
        TypeError,
      );
    });

    it("throws TypeError for invalid trimWhitespace", async () => {
      expect(() => rehypeHeadingSlug({ trimWhitespace: "true" })).toThrow(
        TypeError,
      );
    });

    it("throws TypeError for invalid existingIdHandling", async () => {
      expect(() => rehypeHeadingSlug({ existingIdHandling: "foo" })).toThrow(
        TypeError,
      );
    });

    it("throws TypeError for invalid assignIdToEmptyHeading", async () => {
      expect(() =>
        rehypeHeadingSlug({ assignIdToEmptyHeading: "true" }),
      ).toThrow(TypeError);
    });

    it("throws TypeError for invalid strictSlugRegex", () => {
      expect(() => rehypeHeadingSlug({ strictSlugRegex: "true" })).toThrow(
        TypeError,
      );
      expect(() => rehypeHeadingSlug({ strictSlugRegex: 1 })).toThrow(
        TypeError,
      );
    });

    it("throws error when slugRegex lacks capture group and strictSlugRegex is true", () => {
      const regexWithoutGroup = /no-capture$/;
      expect(() =>
        rehypeHeadingSlug({
          slugRegex: regexWithoutGroup,
          strictSlugRegex: true,
        }),
      ).toThrow(/capture group/);
    });
  });

  describe("Edge case handling", () => {
    it("handles regex without capture group gracefully", async () => {
      const regex = /test$/;
      const input = "<h1>foo test</h1>";
      const result = await processHtml(input, { slugRegex: regex });
      expect(result).toContain('<h1 id="test">foo</h1>');
    });
  });
});

import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Internal implementation details", () => {
  describe("Unicode normalization behavior", () => {
    it("does not normalize explicit slugs when normalizeUnicode is enabled", async () => {
      const input = "<h1>Title {#caf\u00e9 slug!}</h1>";
      const result = await processHtml(input, {
        invalidSlugHandling: "convert",
        normalizeUnicode: true,
      });
      expect(result).toContain('id="caf\u00e9-slug"');
      expect(result).not.toContain('id="cafe-slug"');
    });
  });

  describe("Malformed node handling", () => {
    it("handles headings with null children gracefully", async () => {
      const plugin = () => (tree) => {
        tree.children.forEach((node) => {
          if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
            node.children = null;
          }
        });
      };
      const html = "<h1>Test</h1>";

      await expect(
        processHtml(html, { rehypePlugins: [plugin] }),
      ).resolves.not.toThrow();
    });

    it("handles headings with non-array children gracefully", async () => {
      const plugin = () => (tree) => {
        tree.children.forEach((node) => {
          if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
            node.children = "not_an_array";
          }
        });
      };
      const html = "<h1>Test</h1>";

      await expect(
        processHtml(html, { rehypePlugins: [plugin] }),
      ).resolves.not.toThrow();
    });
  });

  describe("Edge case validation", () => {
    it("throws error for invalid existingIdHandling value", () => {
      expect(() => {
        processHtml("<h1 id='existing'>Test</h1>", {
          existingIdHandling: "invalid_value",
        });
      }).toThrow(
        'existingIdHandling must be "always", "never", "explicit", or "error"',
      );
    });

    it("overwrites existing id with explicit slug", async () => {
      const input = '<h1 id="existing">Test {#custom}</h1>';
      const result = await processHtml(input);
      expect(result).toContain('id="custom"');
    });
  });
});

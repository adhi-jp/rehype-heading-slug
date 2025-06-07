import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Configuration options", () => {
  describe("Custom slug regex", () => {
    it("applies custom slugRegex pattern", async () => {
      const customRegex = /\[id:([a-zA-Z0-9_-]+)\]$/;
      const input = "<h1>Custom Notation [id:custom-notation]</h1>";
      const result = await processHtml(input, { slugRegex: customRegex });
      expect(result).toContain('<h1 id="custom-notation">Custom Notation</h1>');
    });
  });

  describe("Case handling", () => {
    it("maintains original case when maintainCase is true", async () => {
      const input = "<h1>Test Heading</h1>";
      const result = await processHtml(input, { maintainCase: true });
      expect(result).toContain('<h1 id="Test-Heading">Test Heading</h1>');
    });
    it("converts to lowercase when maintainCase is false", async () => {
      const input = "<h1>Test Heading</h1>";
      const result = await processHtml(input, { maintainCase: false });
      expect(result).toContain('<h1 id="test-heading">Test Heading</h1>');
    });

    it("defaults to lowercase conversion", async () => {
      const input = "<h1>Test Heading</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="test-heading">Test Heading</h1>');
    });
  });

  describe("Unicode normalization", () => {
    it("preserves Unicode characters by default", async () => {
      const input = "<h1>Café français</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="café-français"');
    });
    it("normalizes accent characters when enabled", async () => {
      const input = "<h1>Café français</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="cafe-francais"');
    });
    it("normalizes Nordic characters when enabled", async () => {
      const input = "<h1>Øresund Æther</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="oresund-aether"');
    });
    it("preserves non-Latin characters when enabled", async () => {
      const input = "<h1>안녕 세계</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="안녕-세계"');
    });
  });

  describe("Empty heading handling", () => {
    it("skips empty headings by default", async () => {
      const input = "<h1>   </h1><h2>\n\t</h2>";
      const result = await processHtml(input);
      expect(result).toContain("<h1>   </h1>");
      expect(result).toContain("<h2>\n\t</h2>");
    });
    it("generates IDs for empty headings when enabled", async () => {
      const input = "<h1>   </h1><h2>\n\t</h2><h1></h1><h2> </h2>";
      const result = await processHtml(input, { assignIdToEmptyHeading: true });
      expect(result).toContain('<h1 id="h1-1">   </h1>');
      expect(result).toContain('<h2 id="h2-1">\n\t</h2>');
      expect(result).toContain('<h1 id="h1-2"></h1>');
      expect(result).toContain('<h2 id="h2-2"> </h2>');
    });
  });

  describe("Existing ID handling", () => {
    it("overwrites existing IDs only with explicit slugs by default", async () => {
      const input = '<h1 id="old-id">New Heading {#new-heading}</h1>';
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="new-heading">New Heading</h1>');
    });
    it("preserves existing IDs when explicit mode is set", async () => {
      const input = '<h1 id="old-id">New Heading</h1>';
      const result = await processHtml(input, { existingIdHandling: "explicit" });
      expect(result).toContain('<h1 id="old-id">New Heading</h1>');
    });
    it("always overwrites existing IDs when always mode is set", async () => {
      const input = '<h1 id="old-id">New Heading</h1>';
      const result = await processHtml(input, { existingIdHandling: "always" });
      expect(result).toContain('<h1 id="new-heading">New Heading</h1>');
    });
    it("never overwrites existing IDs when never mode is set", async () => {
      const input = '<h1 id="old-id">New Heading {#new-heading}</h1>';
      const result = await processHtml(input, { existingIdHandling: "never" });
      expect(result).toContain('<h1 id="old-id">New Heading</h1>');
    });
    it("throws error when error mode is set and ID exists", async () => {
      const input = '<h1 id="old-id">New Heading</h1>';
      await expect(
        processHtml(input, { existingIdHandling: "error" }),
      ).rejects.toThrow("Heading already has an id");
    });
  });
});

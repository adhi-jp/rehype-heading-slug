import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Advanced scenarios", () => {
  describe("Complex HTML structures", () => {
    it("processes headings with nested inline elements", async () => {
      const input = "<h1>Multiple<strong>Text</strong>Nodes {#multi-text}</h1>";
      const result = await processHtml(input);
      expect(result).toContain(
        '<h1 id="multi-text">Multiple<strong>Text</strong>Nodes</h1>',
      );
    });

    it("adds id to headings with existing attributes", async () => {
      const input = '<h1 class="title">Heading</h1>';
      const result = await processHtml(input);
      expect(result).toContain('<h1 class="title" id="heading">Heading</h1>');
    });
  });

  describe("Special character handling", () => {
    it("removes special characters from generated slugs", async () => {
      const input = "<h1>Heading!@#$%^&*()</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="heading"');
    });

    it("preserves numeric content in slugs", async () => {
      const input = "<h1>123</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="123">123</h1>');
    });
  });

  describe("Edge cases", () => {
    it("ignores whitespace-only headings", async () => {
      const input = "<h1>   </h1>";
      const result = await processHtml(input);
      expect(result).toContain("<h1>   </h1>");
    });

    it("processes headings with only explicit slug notation", async () => {
      const input = "<h1>{#only-slug}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="only-slug"></h1>');
    });
  });
});

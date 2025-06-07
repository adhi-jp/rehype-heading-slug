import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Slug generation and handling", () => {
  describe("Explicit slug notation", () => {
    it("extracts and applies explicit slug notation", async () => {
      const input = "<h1>English {#english}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="english">English</h1>');
    });

    it("handles explicit slug notation with surrounding whitespace", async () => {
      const input = "<h1>Title  {#custom-slug}  </h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="custom-slug">Title</h1>');
    });

    it("supports explicit slugs with mixed character types", async () => {
      const input = "<h1>Heading {#heading_123-test}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="heading_123-test">Heading</h1>');
    });
  });

  describe("Duplicate slug resolution", () => {
    it("appends numbering to duplicate auto-generated slugs", async () => {
      const input =
        "<h1>Same Heading</h1><h2>Same Heading</h2><h3>Same Heading</h3>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="same-heading">Same Heading</h1>');
      expect(result).toContain('<h2 id="same-heading-1">Same Heading</h2>');
      expect(result).toContain('<h3 id="same-heading-2">Same Heading</h3>');
    });

    it("appends numbering to duplicate explicit slugs", async () => {
      const input = "<h1>Heading1 {#custom}</h1><h2>Heading2 {#custom}</h2>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="custom">Heading1</h1>');
      expect(result).toContain('<h2 id="custom-1">Heading2</h2>');
    });
  });
});

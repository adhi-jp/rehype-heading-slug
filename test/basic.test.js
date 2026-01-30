import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Basic functionality", () => {
  describe("Standard slug generation", () => {
    it("adds id attributes to h1-h6 headings", async () => {
      const input =
        "<h1>Heading1</h1><h2>Heading2</h2><h3>Heading3</h3><h4>Heading4</h4><h5>Heading5</h5><h6>Heading6</h6>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="heading1">Heading1</h1>');
      expect(result).toContain('<h2 id="heading2">Heading2</h2>');
      expect(result).toContain('<h3 id="heading3">Heading3</h3>');
      expect(result).toContain('<h4 id="heading4">Heading4</h4>');
      expect(result).toContain('<h5 id="heading5">Heading5</h5>');
      expect(result).toContain('<h6 id="heading6">Heading6</h6>');
    });

    it("generates kebab-case slugs for multi-word headings", async () => {
      const input = "<h1>Hello World</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="hello-world">Hello World</h1>');
    });

    it("converts headings to lowercase by default", async () => {
      const input = "<h1>English</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="english">English</h1>');
    });
  });

  describe("Element exclusion", () => {
    it("ignores empty headings", async () => {
      const input = "<h1></h1>";
      const result = await processHtml(input);
      expect(result).toBe("<h1></h1>");
    });

    it("ignores non-heading elements", async () => {
      const input = "<p>Paragraph</p><div>Division</div>";
      const result = await processHtml(input);
      expect(result).toBe("<p>Paragraph</p><div>Division</div>");
    });
  });
});

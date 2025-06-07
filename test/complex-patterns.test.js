import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Custom slug patterns", () => {
  describe("Custom delimiter patterns", () => {
    it("processes SLUG_delimiter_SLUG pattern", async () => {
      const input = "<h1>My Heading SLUG_my-custom-slug_SLUG</h1>";
      const options = {
        slugRegex: /SLUG_([a-zA-Z0-9_\-]+)_SLUG$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="my-custom-slug"');
      expect(result).toContain("My Heading");
      expect(result).not.toContain("SLUG_my-custom-slug_SLUG");
    });

    it("processes arrow-style delimiter pattern", async () => {
      const input = "<h1>Another Heading <=-[arrow-slug]-=></h1>";
      const options = {
        slugRegex: /<=-\[([a-zA-Z0-9_\-]+)\]-=>$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="arrow-slug"');
      expect(result).toContain("Another Heading");
      expect(result).not.toContain("<=-[arrow-slug]-=>");
    });

    it("processes START_slug_END pattern", async () => {
      const input = "<h1>Complex Heading START_start-end-slug_END</h1>";
      const options = {
        slugRegex: /START_([a-zA-Z0-9_\-]+)_END$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="start-end-slug"');
      expect(result).toContain("Complex Heading");
      expect(result).not.toContain("START_start-end-slug_END");
    });

    it("processes triple bracket pattern", async () => {
      const input = "<h1>Triple Bracket Test [[[triple-bracket-slug]]]</h1>";
      const options = {
        slugRegex: /\[\[\[([a-zA-Z0-9_\-]+)\]\]\]$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="triple-bracket-slug"');
      expect(result).toContain("Triple Bracket Test");
      expect(result).not.toContain("[[[triple-bracket-slug]]]");
    });

    it("processes dollar sign delimited pattern", async () => {
      const input = "<h1>Dollar Signs Test $$dollar-slug$$</h1>";
      const options = {
        slugRegex: /\$\$([a-zA-Z0-9_\-]+)\$\$$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="dollar-slug"');
      expect(result).toContain("Dollar Signs Test");
      expect(result).not.toContain("$$dollar-slug$$");
    });

    it("processes percentage delimited pattern", async () => {
      const input = "<h1>Percentage Test %percent-slug%</h1>";
      const options = {
        slugRegex: /%([a-zA-Z0-9_\-]+)%$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="percent-slug"');
      expect(result).toContain("Percentage Test");
      expect(result).not.toContain("%percent-slug%");
    });
  });

  describe("Fallback behavior", () => {
    it("generates auto slug when custom pattern doesn't match", async () => {
      const input = "<h1>No Complex Pattern Here</h1>";
      const options = {
        slugRegex: /SLUG_([a-zA-Z0-9_\-]+)_SLUG$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="no-complex-pattern-here"');
      expect(result).toContain("No Complex Pattern Here");
    });

    it("handles mixed content with different patterns", async () => {
      const input = `
        <h1>Normal heading</h1>
        <h2>Default notation {#default-slug}</h2>
        <h3>Complex pattern SLUG_complex-test_SLUG</h3>
        <h4>Another heading without pattern</h4>
      `;
      const options = {
        slugRegex: /SLUG_([a-zA-Z0-9_\-]+)_SLUG$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="complex-test"');
      expect(result).not.toContain("SLUG_complex-test_SLUG");
      expect(result).toContain('id="default-slug"');
      expect(result).not.toContain("{#default-slug}");
      expect(result).toContain('id="normal-heading"');
      expect(result).toContain('id="another-heading-without-pattern"');
    });

    it("generates auto slug when regex has no capture group", async () => {
      const input = "<h1>Heading with explicit @@slug@@</h1>";
      const options = {
        slugRegex: /@@slug@@$/,
        trimWhitespace: true,
      };
      const result = await processHtml(input, options);

      expect(result).toContain('id="slug"');
      expect(result).toContain("Heading with explicit</h1>");
    });
  });
});

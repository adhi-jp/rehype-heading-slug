import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("Unicode and special character support", () => {
  describe("Default Unicode preservation", () => {
    it("preserves accent characters without normalization", async () => {
      const input = "<h1>Café français</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="café-français"');
    });

    it("preserves Nordic characters without normalization", async () => {
      const input = "<h1>Øresund Æther</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="øresund-æther"');
    });

    it("preserves non-Latin characters without normalization", async () => {
      const testCases = [
        {
          name: "Russian (Cyrillic)",
          input: "<h1>Привет мир</h1>",
          expected: 'id="привет-мир"',
        },
        {
          name: "Chinese (Simplified)",
          input: "<h1>你好世界</h1>",
          expected: 'id="你好世界"',
        },
        {
          name: "Korean (Hangul)",
          input: "<h1>안녕 세계</h1>",
          expected: 'id="안녕-세계"',
        },
      ];
      for (const testCase of testCases) {
        const result = await processHtml(testCase.input);
        expect(result, `${testCase.name} test failed`).toContain(
          testCase.expected,
        );
      }
    });
  });

  describe("Unicode normalization behavior", () => {
    it("converts various accent characters to ASCII equivalents", async () => {
      const testCases = [
        {
          name: "French",
          input: "<h1>Café français</h1>",
          expected: 'id="cafe-francais"',
        },
        {
          name: "German",
          input: "<h1>Über München</h1>",
          expected: 'id="uber-munchen"',
        },
        {
          name: "Spanish",
          input: "<h1>Año español</h1>",
          expected: 'id="ano-espanol"',
        },
      ];
      for (const testCase of testCases) {
        const result = await processHtml(testCase.input, {
          normalizeUnicode: true,
        });
        expect(result, `${testCase.name} normalization test failed`).toContain(
          testCase.expected,
        );
      }
    });

    it("converts Nordic characters to ASCII equivalents", async () => {
      const input = "<h1>Øresund Æther</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="oresund-aether"');
    });

    it("leaves non-Latin characters unchanged during normalization", async () => {
      const input = "<h1>안녕 세계</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="안녕-세계"');
    });

    it("processes mixed character sets correctly", async () => {
      const input = "<h1>Hello 世界 Café</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="hello-世界-cafe"');
    });

    it("preserves explicit slugs from normalization", async () => {
      const input = "<h1>見出し {#café-français}</h1>";
      const result = await processHtml(input, { normalizeUnicode: true });
      expect(result).toContain('id="café-français"');
    });
  });

  describe("Explicit Unicode slugs", () => {
    it("supports explicit slugs with Unicode characters", async () => {
      const input = "<h1>Café {#café-français}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="café-français">Café</h1>');
    });

    it("supports explicit slugs with Japanese characters", async () => {
      const input = "<h1>見出し {#日本語-テスト}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="日本語-テスト">見出し</h1>');
    });

    it("supports explicit slugs with complex Unicode patterns", async () => {
      const input = "<h1>見出し {#見出し-テスト}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="見出し-テスト">見出し</h1>');
    });
  });

  describe("Unicode duplicate handling", () => {
    it("resolves duplicate Unicode slugs with numbering", async () => {
      const input = "<h1>同じ見出し</h1><h2>同じ見出し</h2><h3>同じ見出し</h3>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="同じ見出し">同じ見出し</h1>');
      expect(result).toContain('<h2 id="同じ見出し-1">同じ見出し</h2>');
      expect(result).toContain('<h3 id="同じ見出し-2">同じ見出し</h3>');
    });

    it("resolves duplicate explicit Unicode slugs with numbering", async () => {
      const input = "<h1>見出し1 {#custom}</h1><h2>見出し2 {#custom}</h2>";
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="custom">見出し1</h1>');
      expect(result).toContain('<h2 id="custom-1">見出し2</h2>');
    });
  });

  describe("Explicit slug normalization interaction", () => {
    it("preserves valid explicit slugs regardless of normalization setting", async () => {
      const input = "<h1>Test {#café-français}</h1>";
      const result = await processHtml(input, {
        normalizeUnicode: true,
      });

      // Valid explicit slugs should never be normalized
      expect(result).toContain('id="café-français"');
      expect(result).not.toContain('id="cafe-francais"');
    });

    it("preserves invalid explicit slugs from normalization during conversion", async () => {
      const input = "<h1>Test {#café français!}</h1>";
      const result = await processHtml(input, {
        invalidSlugHandling: "convert",
        normalizeUnicode: true,
      });

      // Invalid explicit slugs should be converted but not normalized by normalizeUnicode
      // The github-slugger itself may normalize, but normalizeUnicode should not apply
      expect(result).toContain('id="café-français"');
      expect(result).not.toContain('id="cafe-francais"');
    });

    it("preserves heading text when explicit slug overrides normalization", async () => {
      const input = "<h1>Café français {#café-original}</h1>";
      const result = await processHtml(input, {
        normalizeUnicode: true,
      });

      // The explicit slug should remain unchanged regardless of normalizeUnicode setting
      expect(result).toContain('id="café-original"');
      // Text should NOT be normalized when explicit slug is present (this is the correct specification)
      expect(result).toContain(">Café français</h1>"); // Slug notation is removed but text remains unnormalized
    });
  });
});

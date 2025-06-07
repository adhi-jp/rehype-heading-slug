import { describe, it, expect } from "vitest";
import { processHtml } from "./utils.js";

describe("HTML structure and formatting", () => {
  describe("Whitespace handling", () => {
    it("processes headings with line breaks", async () => {
      const input = `<h1>First Line
Second Line</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="first-line-second-line"');
    });

    it("processes headings with multiple line breaks", async () => {
      const input = `<h1>Line One

Line Two


Line Three</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="line-one-line-two-line-three"');
    });

    it("trims leading and trailing whitespace", async () => {
      const input = `<h1>    Padded Heading    </h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="padded-heading"');
    });

    it("normalizes tabs and mixed whitespace", async () => {
      const input = `<h1>\t\tTabbed\t Heading \t</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="tabbed-heading"');
    });
  });

  describe("Complex document structures", () => {
    it("processes headings in multi-line HTML", async () => {
      const input = `
        <h1>Main Title</h1>
        <p>Some paragraph content</p>
        <h2>
          Secondary Title
        </h2>
        <div>
          <h3>Nested Heading</h3>
        </div>
      `;
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="main-title">Main Title</h1>');
      expect(result).toContain('id="secondary-title"');
      expect(result).toContain('<h3 id="nested-heading">Nested Heading</h3>');
    });

    it("processes headings in complete HTML documents", async () => {
      const input = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>
    <header>
      <h1>Website Header</h1>
    </header>
    <main>
      <section>
        <h2>Section Title</h2>
        <article>
          <h3>Article Heading</h3>
        </article>
      </section>
    </main>
  </body>
</html>`;
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="website-header">Website Header</h1>');
      expect(result).toContain('<h2 id="section-title">Section Title</h2>');
      expect(result).toContain('<h3 id="article-heading">Article Heading</h3>');
    });
  });

  describe("Explicit slugs with formatting", () => {
    it("processes explicit slugs with line breaks", async () => {
      const input = `<h1>Title
{#custom-slug}</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="custom-slug">Title</h1>');
    });

    it("processes explicit slugs with indentation", async () => {
      const input = `<h1>  Indented Title  
  {#indented-slug}  </h1>`;
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="indented-slug">  Indented Title</h1>');
    });

    it("preserves whitespace when trimWhitespace is disabled", async () => {
      const input = `<h1>  Indented Title  \n  {#indented-slug}  </h1>`;
      const result = await processHtml(input, { trimWhitespace: false });
      expect(result).toContain(
        '<h1 id="indented-slug">  Indented Title  \n    </h1>',
      );
    });

    it("processes multi-line headings with explicit slugs", async () => {
      const input = `<h1>Multi-line
Heading Content
{#multi-line-slug}</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="multi-line-slug"');
      expect(result).toContain("Multi-line");
      expect(result).toContain("Heading Content");
    });
  });

  describe("Nested HTML elements", () => {
    it("processes headings with inline elements", async () => {
      const input = `<h1>
        <em>Emphasized</em>
        and
        <strong>Strong</strong>
        Text
      </h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="emphasized-and-strong-text"');
      expect(result).toContain("<em>Emphasized</em>");
      expect(result).toContain("<strong>Strong</strong>");
    });

    it("processes headings with complex nested elements", async () => {
      const input = `<h2>
        Complex
        <span class="highlight">
          Nested
          <code>Code</code>
        </span>
        Structure
        {#complex-nested}
      </h2>`;
      const result = await processHtml(input);
      expect(result).toContain('<h2 id="complex-nested">');
      expect(result).toContain("Complex");
      expect(result).toContain('<span class="highlight">');
      expect(result).toContain("<code>Code</code>");
      expect(result).toContain("Structure");
    });

    it("preserves HTML structure while extracting text content", async () => {
      const input = `<h1>
        Text with
        <a href="#link">
          Link
        </a>
        and
        <img src="image.jpg" alt="Alt text" />
        image
      </h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="text-with-link-and-image"');
      expect(result).toContain('<a href="#link">');
      expect(result).toContain('<img src="image.jpg" alt="Alt text"');
    });
  });

  describe("Edge cases", () => {
    it("processes whitespace-only headings with explicit slugs", async () => {
      const input = `<h1>   
        
        {#whitespace-only}
      </h1>`;
      const result = await processHtml(input);
      expect(result).toContain('<h1 id="whitespace-only">');
    });

    it("handles malformed but parseable HTML", async () => {
      const input = `<h1>Unclosed span <span>content
      and more text</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="unclosed-span-content-and-more-text"');
    });

    it("handles different line ending types", async () => {
      const input = "<h1>Windows\r\nLine\nEndings\rMixed {#mixed-endings}</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="mixed-endings"');
      expect(result).toContain("Windows");
      expect(result).toContain("Line");
      expect(result).toContain("Endings");
      expect(result).toContain("Mixed");
    });

    it("processes very long multi-line headings", async () => {
      const input = `<h1>This is a very long heading that spans\nmultiple lines and contains many words that should\nbe properly processed and converted into a slug\n{#long-heading}</h1>`;
      const result = await processHtml(input);
      expect(result).toContain('id="long-heading"');
      expect(result).toContain("This is a very long heading that spans");
      expect(result).toContain(
        "multiple lines and contains many words that should",
      );
      expect(result).toContain(
        "be properly processed and converted into a slug",
      );
    });
  });

  describe("Whitespace normalization", () => {
    it("normalizes multiple spaces", async () => {
      const input = "<h1>Multiple    Spaces     Between    Words</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="multiple-spaces-between-words"');
    });

    it("normalizes mixed whitespace characters", async () => {
      const input = "<h1>Mixed\t\tTabs\n\nNewlines   Spaces</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="mixed-tabs-newlines-spaces"');
    });

    it("handles Unicode whitespace characters", async () => {
      const input =
        "<h1>Unicode\u00A0Non-Breaking\u2009Thin\u2003Em Space</h1>";
      const result = await processHtml(input);
      expect(result).toContain('id="unicode-non-breaking-thin-em-space"');
    });
  });
});

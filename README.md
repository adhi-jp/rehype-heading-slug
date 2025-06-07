# rehype-heading-slug

[![build status](https://github.com/adhi-jp/rehype-heading-slug/actions/workflows/type-check.yml/badge.svg)](https://github.com/adhi-jp/rehype-heading-slug/actions)
[![npm version](https://img.shields.io/npm/v/rehype-heading-slug.svg)](https://www.npmjs.com/package/rehype-heading-slug)
[![bundle size](https://deno.bundlejs.com/?q=rehype-heading-slug&badge)](https://bundlejs.com/?q=rehype-heading-slug)

A [rehype](https://github.com/rehypejs/rehype) plugin that automatically adds `id` attributes to heading elements (`<h1>`–`<h6>`). This plugin utilizes [github-slugger](https://github.com/Flet/github-slugger) and supports explicit slug notation, Unicode normalization, handling of duplicates and invalid slugs, and provides flexible strategies for managing existing `id` attributes and empty headings.

## Overview

**rehype-heading-slug** is a [unified](https://github.com/unifiedjs/unified) ([rehype](https://github.com/rehypejs/rehype)) plugin designed to assign unique `id` attributes to HTML headings. Key features include:

- **Explicit slug notation**: Specify a custom `id` directly by appending `{#custom-slug}` to headings.
- **Unicode normalization**: Optionally normalize accented or non-ASCII characters to ASCII in slugs.
- **Duplicate and invalid slug handling**: Define your preferred approach to managing duplicates or invalid slugs.
- **Flexible id assignment**: Control behaviors for existing `id` attributes and empty heading elements.

## When Should You Use This Plugin?

This plugin is especially useful if you require:

- Anchor links for headings in HTML documents
- Explicit control over heading slugs
- Unicode normalization support for multilingual headings
- Custom handling for duplicate or invalid slugs
- Detailed control over existing `id` attributes and empty headings

## Installation

```sh
npm install rehype-heading-slug
```

## Usage Example

Given the following HTML snippet:

```html
<h1>Introduction</h1>
<h2>日本語の見出し</h2>
<h2>Duplicate</h2>
<h2>Duplicate</h2>
<h3>Explicit {#custom-slug}</h3>
```

And JavaScript code:

```js
import { rehype } from "rehype";
import rehypeHeadingSlug from "rehype-heading-slug";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeHeadingSlug, { normalizeUnicode: true })
  .process(
    "<h1>Introduction</h1><h2>日本語の見出し</h2><h2>Duplicate</h2><h2>Duplicate</h2><h3>Explicit {#custom-slug}</h3>",
  );

console.log(String(file));
```

This will produce:

```html
<h1 id="introduction">Introduction</h1>
<h2 id="日本語の見出し">日本語の見出し</h2>
<h2 id="duplicate">Duplicate</h2>
<h2 id="duplicate-1">Duplicate</h2>
<h3 id="custom-slug">Explicit</h3>
```

> **Note:** MDX does not allow curly braces (`{}`) within headings. If you use MDX, configure a custom slug format via the `slugRegex` option.

### MDX Compatibility Example

To avoid MDX parse errors, you can use a different slug notation, such as `[#custom-slug]`:

```js
import { rehype } from "rehype";
import rehypeHeadingSlug from "rehype-heading-slug";

const mdxSlugRegex = /\s*\[#([A-Za-z0-9\-_]+)\]\s*$/;

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeHeadingSlug, { slugRegex: mdxSlugRegex })
  .process("<h2>My heading [#my-slug]</h2>");

console.log(String(file));
// <h2 id="my-slug">My heading</h2>
```

## API

### `rehype().use(rehypeHeadingSlug[, options])`

Assigns `id` attributes to heading elements (`<h1>`–`<h6>`), supporting explicit slugs and extensive configuration options.

#### Options

All options are optional:

| Name                     | Type    | Default                                  | Description                                                                                                          |
| ------------------------ | ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `slugRegex`              | RegExp  | `/\{#([a-zA-Z0-9_\-\u00C0-\uFFFF]+)\}$/` | Regular expression matching explicit slug notation                                                                   |
| `maintainCase`           | boolean | `false`                                  | Maintain original case in slugs (`true`) or convert to lowercase (`false`)                                           |
| `duplicateSlugHandling`  | string  | `'numbering'`                            | Strategy for duplicate slugs: `'numbering'` (suffix with numbers) or `'error'` (throw an error)                      |
| `invalidSlugHandling`    | string  | `'convert'`                              | Strategy for invalid explicit slugs: `'convert'` (auto-fix) or `'error'`                                             |
| `normalizeUnicode`       | boolean | `false`                                  | Normalize Unicode characters (e.g., `é` to `e`)                                                                      |
| `trimWhitespace`         | boolean | `true`                                   | Trim whitespace from headings and slugs                                                                              |
| `existingIdHandling`     | string  | `'explicit'`                             | Manage existing `id` attributes: `'always'`, `'never'`, `'explicit'` (overwrite only if explicit slug), or `'error'` |
| `assignIdToEmptyHeading` | boolean | `false`                                  | Assign an `id` to empty headings (`true` or `false`). If `true`, assigns ids like `h2-1`, `h3-2`, etc.               |
| `strictSlugRegex`        | boolean | `false`                                  | If `true`, require that `slugRegex` contains a capture group. Throws if not.                                         |

For full details, refer to [lib/types.d.ts](./lib/types.d.ts).

## Security

**⚠️ Important:** Adding `id` attributes can introduce [cross-site scripting (XSS)](https://en.wikipedia.org/wiki/Cross-site_scripting) risks through DOM clobbering. Always use [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) and refer to its [example](https://github.com/rehypejs/rehype-sanitize#example-headings-dom-clobbering) for best practices.

## Related Plugins

- [rehype-slug](https://github.com/rehypejs/rehype-slug): Simple slugging without explicit slugs or Unicode normalization.
- [rehype-slug-custom-id](https://github.com/playfulprogramming/rehype-slug-custom-id): Simple slugging with explicit slug support.
- [rehype-autolink-headings](https://github.com/rehypejs/rehype-autolink-headings): Automatically creates anchor links for headings.

## AI-Assisted Development Notice

This project was mainly developed using GitHub Copilot and other generative AI tools. The majority of the source code and documentation is AI-generated.

### Human Oversight

- **Role**: Primarily review and validate test cases for accuracy and relevance.
- **Responsibility**: Users and contributors should thoroughly review and test AI-generated content before use in critical or production environments.

**⚠️ Disclaimer**: AI-generated content may have unintended inaccuracies or biases. Exercise caution and validate thoroughly for critical applications.

## License

[MIT License](./blob/main/LICENSE) © [adhi-jp](https://github.com/adhi-jp)

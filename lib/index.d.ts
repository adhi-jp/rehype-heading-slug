import type { Transformer } from "unified";
import type { Root } from "hast";

/**
 * Valid heading levels in HTML.
 */
export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * How to handle duplicate slugs when encountered.
 * - 'numbering': Append numbers to make unique (e.g., 'slug', 'slug-1', 'slug-2')
 * - 'error': Throw an error
 */
export type DuplicateSlugHandling = "numbering" | "error";

/**
 * How to handle invalid explicit slugs. An explicit slug is invalid when the
 * notation does not match `pattern` (for example `{#my slug}` with the default
 * pattern), or when the captured slug contains characters other than letters,
 * digits, `-`, and `_` (ASCII or U+00C0–U+FFFF).
 * - 'convert': Convert invalid slugs using github-slugger
 * - 'error': Throw an error
 */
export type InvalidSlugHandling = "convert" | "error";

/**
 * How to handle a `pattern` that has no capture group.
 * - 'wrap': Wrap the whole pattern in a capture group
 * - 'error': Throw an error
 */
export type MissingCaptureGroupHandling = "wrap" | "error";

/**
 * How to handle existing id attributes on headings. An empty id (`id=""`)
 * counts as no id. Ids that are kept are reserved, so generated slugs never
 * collide with them.
 * - 'always': Always override existing ids
 * - 'never': Never override existing ids
 * - 'explicit': Only override if explicit slug syntax is found
 * - 'error': Throw an error if an existing id is found
 */
export type ExistingIdHandling = "always" | "never" | "explicit" | "error";

/**
 * Configuration options for the rehype-heading-slug plugin.
 */
export interface RehypeHeadingSlugOptions {
  /**
   * Regular expression matching the explicit slug notation at the end of the
   * heading text. The first capture group is the slug.
   *
   * The pattern is always anchored to the end of the heading text, so a
   * trailing `$` is optional. The `i`, `s`, `u`, and `v` flags are honoured;
   * `g`, `m`, and `y` are ignored. The default `{#slug}` notation stays
   * recognised next to a custom pattern. Notation inside `<code>`, `<kbd>`,
   * `<pre>`, `<samp>`, and `<tt>` is left alone.
   * @default /\{#([a-zA-Z0-9_\-À-￿]+)\}$/
   */
  pattern?: RegExp;

  /**
   * How to handle a `pattern` that has no capture group.
   * @default 'wrap'
   */
  missingCaptureGroupHandling?: MissingCaptureGroupHandling;

  /**
   * Preserve case when generating slugs. Applies to generated and explicit
   * slugs alike, which both go through github-slugger.
   * @default false
   */
  maintainCase?: boolean;

  /**
   * How to handle duplicate slugs.
   * @default 'numbering'
   */
  duplicateSlugHandling?: DuplicateSlugHandling;

  /**
   * How to handle invalid explicit slugs.
   * @default 'convert'
   */
  invalidSlugHandling?: InvalidSlugHandling;

  /**
   * Normalize Latin-based accented characters to ASCII equivalents in
   * generated slugs (é→e, ø→o, ß→ss, œ→oe, ...). Other scripts (Cyrillic,
   * Greek, CJK, ...) are preserved. Explicit slugs are never normalized.
   * @default false
   */
  normalizeUnicode?: boolean;

  /**
   * Whether whitespace around the explicit slug notation is removed together
   * with the notation, and whether runs of (Unicode) whitespace in the
   * heading text are collapsed to a single `-` when generating a slug.
   * The heading's own text content is otherwise left untouched.
   * @default true
   */
  trimWhitespace?: boolean;

  /**
   * How to handle existing id attributes.
   * @default 'explicit'
   */
  existingIdHandling?: ExistingIdHandling;

  /**
   * Assign an id such as `h2-1` (counted per heading level and per document)
   * to headings that have no text, or whose text yields an empty slug.
   * @default false
   */
  assignIdToEmptyHeading?: boolean;

  /**
   * Regular expression for matching explicit slug notation.
   * @deprecated Use `pattern` instead. `pattern` takes precedence when both are set.
   */
  slugRegex?: RegExp;

  /**
   * Require `slugRegex` to contain a capture group.
   * `true` maps to `missingCaptureGroupHandling: 'error'` and `false` maps to
   * `missingCaptureGroupHandling: 'wrap'`.
   * @deprecated Use `missingCaptureGroupHandling` instead.
   * `missingCaptureGroupHandling` takes precedence when both are set.
   */
  strictSlugRegex?: boolean;
}

/**
 * Rehype plugin that assigns `id` attributes to heading elements.
 *
 * Features:
 * - Supports explicit slug notation: {#custom-slug}
 * - Automatic slug generation from heading text
 * - Unicode character normalization (optional)
 * - Configurable duplicate and invalid slug handling
 * - Flexible whitespace and existing id handling
 * - Configurable handling of patterns without a capture group
 *
 * Errors: invalid options throw a `TypeError`; problems with the document
 * (invalid or duplicate slugs, existing ids in 'error' mode) throw an `Error`.
 * All messages start with `rehype-heading-slug:`.
 *
 * @param options - Plugin configuration options
 * @returns The transformer function
 */
declare function rehypeHeadingSlug(
  options?: RehypeHeadingSlugOptions | null,
): Transformer<Root, Root>;

export default rehypeHeadingSlug;

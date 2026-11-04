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
 * How to handle invalid slugs that don't match the slug regex.
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
 * How to handle existing id attributes on headings.
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
   * heading text. The first capture group is used as the slug. Regex flags are
   * ignored because the pattern is always anchored to the end of the text.
   * @default /\{#([a-zA-Z0-9_\-\u00C0-\uFFFF]+)\}$/
   */
  pattern?: RegExp;

  /**
   * How to handle a `pattern` that has no capture group.
   * @default 'wrap'
   */
  missingCaptureGroupHandling?: MissingCaptureGroupHandling;

  /**
   * Preserve case when generating slugs.
   * @default false
   */
  maintainCase?: boolean;

  /**
   * How to handle duplicate slugs.
   * @default 'numbering'
   */
  duplicateSlugHandling?: DuplicateSlugHandling;

  /**
   * How to handle invalid slugs.
   * @default 'convert'
   */
  invalidSlugHandling?: InvalidSlugHandling;

  /**
   * Normalize Unicode characters to ASCII equivalents.
   * Only converts Latin-based accented characters, preserving other character systems
   * (Cyrillic, CJK, etc.). Uses NFD normalization to decompose characters, removes
   * combining diacritical marks, and converts special characters like æ→ae, ø→o, etc.
   * @default false
   */
  normalizeUnicode?: boolean;

  /**
   * Remove leading and trailing whitespace from heading text.
   * @default true
   */
  trimWhitespace?: boolean;

  /**
   * How to handle existing id attributes.
   * @default 'explicit'
   */
  existingIdHandling?: ExistingIdHandling;

  /**
   * Assign id to empty headings using a counter.
   * @default false
   */
  assignIdToEmptyHeading?: boolean;

  /**
   * Regular expression for matching explicit slug notation.
   * @deprecated Use `pattern` instead. Ignored when `pattern` is also set.
   */
  slugRegex?: RegExp;

  /**
   * Require `slugRegex` to contain a capture group.
   * `true` maps to `missingCaptureGroupHandling: 'error'` and `false` maps to
   * `missingCaptureGroupHandling: 'wrap'`.
   * @deprecated Use `missingCaptureGroupHandling` instead. Ignored when
   * `missingCaptureGroupHandling` is also set.
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
 * @param options - Plugin configuration options
 * @returns The transformer function
 */
declare function rehypeHeadingSlug(
  options?: RehypeHeadingSlugOptions | null,
): Transformer<Root, Root>;

export default rehypeHeadingSlug;

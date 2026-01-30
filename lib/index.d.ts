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
   * Regular expression for matching explicit slug notation at end of heading text.
   * Must contain a capture group for the slug when strictSlugRegex is true.
   * @default /\{#([a-zA-Z0-9_\-\u00C0-\uFFFF]+)\}$/
   */
  slugRegex?: RegExp;

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
   * Enable strict slug regex group handling.
   * @default false
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
 * - Strict or non-strict slug regex group handling
 *
 * @param options - Plugin configuration options
 * @returns The transformer function
 */
declare function rehypeHeadingSlug(
  options?: RehypeHeadingSlugOptions | null,
): Transformer<Root, Root>;

export default rehypeHeadingSlug;

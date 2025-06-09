import type { Root } from "hast";
import type { RehypeHeadingSlugOptions } from "./lib/types.d.ts";

export type {
  HeadingLevel,
  HeadingElement,
  DuplicateSlugHandling,
  InvalidSlugHandling,
  ExistingIdHandling,
  RehypeHeadingSlugOptions,
  RegexPatterns,
  ProcessingContext,
  ProcessingOptions,
  ExplicitSlugResult,
} from "./lib/types.d.ts";

/**
 * A rehype plugin that assigns `id` attributes to heading elements.
 */
export default function rehypeHeadingSlug(
  options?: RehypeHeadingSlugOptions & { strictSlugRegex?: boolean },
): (tree: Root) => void;

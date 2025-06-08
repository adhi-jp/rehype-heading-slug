import type { Element } from "hast";
import type Slugger from "github-slugger";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingElement = Element & { tagName: HeadingLevel };

export type DuplicateSlugHandling = "numbering" | "error";
export type InvalidSlugHandling = "convert" | "error";
export type ExistingIdHandling = "always" | "never" | "explicit" | "error";

export interface RehypeHeadingSlugOptions {
  slugRegex?: RegExp;
  maintainCase?: boolean;
  duplicateSlugHandling?: DuplicateSlugHandling;
  invalidSlugHandling?: InvalidSlugHandling;
  normalizeUnicode?: boolean;
  trimWhitespace?: boolean;
  existingIdHandling?: ExistingIdHandling;
  assignIdToEmptyHeading?: boolean;
}

export interface RegexPatterns {
  trimmedSlugRegex: RegExp;
  anySlugPattern: RegExp;
  validSlugPattern: RegExp;
  whitespaceOnlyPattern: RegExp;
}

export interface ProcessingContext {
  regexPatterns: RegexPatterns;
  emptyHeadingCounters: Record<HeadingLevel, number>;
  slugger: Slugger;
  invalidSlugger: Slugger;
  usedSlugs: Set<string>;
  options: ProcessingOptions;
}

export interface ProcessingOptions {
  slugRegex: RegExp;
  maintainCase: boolean;
  duplicateSlugHandling: DuplicateSlugHandling;
  invalidSlugHandling: InvalidSlugHandling;
  normalizeUnicode: boolean;
  trimWhitespace: boolean;
  existingIdHandling: ExistingIdHandling;
  assignIdToEmptyHeading: boolean;
}

export interface ExplicitSlugResult {
  explicitSlug: string | null;
  cleanText: string;
}

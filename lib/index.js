import { visit } from "unist-util-visit";
import Slugger from "github-slugger";

/**
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Text} HastText
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Node} HastNode
 * @typedef {import('hast').Properties} HastProperties
 * @typedef {import('./index.d.ts').HeadingLevel} HeadingLevel
 * @typedef {import('./index.d.ts').DuplicateSlugHandling} DuplicateSlugHandling
 * @typedef {import('./index.d.ts').InvalidSlugHandling} InvalidSlugHandling
 * @typedef {import('./index.d.ts').ExistingIdHandling} ExistingIdHandling
 * @typedef {import('./index.d.ts').RehypeHeadingSlugOptions} RehypeHeadingSlugOptions
 */

/**
 * @typedef {HastElement & { tagName: HeadingLevel }} HeadingElement
 */

/**
 * @typedef {Object} RegexPatterns
 * @property {RegExp} trimmedSlugRegex
 * @property {RegExp} anySlugPattern
 * @property {RegExp} validSlugPattern
 * @property {RegExp} whitespaceOnlyPattern
 */

/**
 * @typedef {Object} ProcessingOptions
 * @property {RegExp} slugRegex
 * @property {boolean} maintainCase
 * @property {DuplicateSlugHandling} duplicateSlugHandling
 * @property {InvalidSlugHandling} invalidSlugHandling
 * @property {boolean} normalizeUnicode
 * @property {boolean} trimWhitespace
 * @property {ExistingIdHandling} existingIdHandling
 * @property {boolean} assignIdToEmptyHeading
 */

/**
 * @typedef {Object} ProcessingContext
 * @property {RegexPatterns} regexPatterns
 * @property {Record<HeadingLevel, number>} emptyHeadingCounters
 * @property {import('github-slugger').default} slugger
 * @property {import('github-slugger').default} invalidSlugger
 * @property {Set<string>} usedSlugs
 * @property {ProcessingOptions} options
 */

/**
 * @typedef {Object} ExplicitSlugResult
 * @property {string | null} explicitSlug
 * @property {string} cleanText
 */

/**
 * A rehype plugin that adds id attributes to headings (h1-h6) using github-slugger.
 *
 * Features:
 * - Supports explicit slug notation: {#custom-slug}
 * - Automatic slug generation from heading text
 * - Unicode character normalization (optional)
 * - Configurable duplicate and invalid slug handling
 * - Flexible whitespace and existing id handling
 * - Strict or non-strict slugRegex group handling (strictSlugRegex option)
 *
 * @param {RehypeHeadingSlugOptions & { strictSlugRegex?: boolean }} [options={}] - Configuration options
 * @returns {function(HastRoot): void} - Unified transformer function
 */
export default function rehypeHeadingSlug(options = {}) {
  if (options !== null && typeof options !== "object") {
    throw new TypeError("Options must be an object or undefined");
  }

  const {
    slugRegex = DEFAULT_SLUG_REGEX,
    maintainCase = false,
    duplicateSlugHandling = "numbering",
    invalidSlugHandling = "convert",
    normalizeUnicode = false,
    trimWhitespace = true,
    existingIdHandling = "explicit",
    assignIdToEmptyHeading = false,
    strictSlugRegex = false,
  } = options;

  validateOptions({
    slugRegex,
    maintainCase,
    duplicateSlugHandling,
    invalidSlugHandling,
    normalizeUnicode,
    trimWhitespace,
    existingIdHandling,
    assignIdToEmptyHeading,
    strictSlugRegex,
  });

  const regexPatterns = createRegexPatterns(
    slugRegex,
    trimWhitespace,
    strictSlugRegex,
  );
  /** @type {Record<HeadingLevel, number>} */
  const emptyHeadingCounters = /** @type {Record<HeadingLevel, number>} */ (
    Object.fromEntries(HEADING_LEVELS.map((level) => [level, 0]))
  );

  return (tree) => {
    const slugger = new Slugger();
    const invalidSlugger = new Slugger();
    /** @type {Set<string>} */
    const usedSlugs = new Set();

    visit(tree, "element", (node) => {
      if (!isHeadingNode(node)) return;

      processHeadingNode(/** @type {HeadingElement} */ (node), {
        regexPatterns,
        emptyHeadingCounters,
        slugger,
        invalidSlugger,
        usedSlugs,
        options: {
          slugRegex,
          maintainCase,
          duplicateSlugHandling,
          invalidSlugHandling,
          normalizeUnicode,
          trimWhitespace,
          existingIdHandling,
          assignIdToEmptyHeading,
        },
      });
    });
  };
}

/**
 * Normalize Unicode characters to ASCII equivalents
 * Only converts Latin-based accented characters, preserving other character systems (Cyrillic, CJK, etc.)
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
function normalizeUnicode(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[æ]/g, "ae")
    .replace(/[Æ]/g, "AE")
    .replace(/[ø]/g, "o")
    .replace(/[Ø]/g, "O")
    .replace(/[þ]/g, "th")
    .replace(/[Þ]/g, "TH")
    .replace(/[ð]/g, "dh")
    .replace(/[Ð]/g, "DH")
    .replace(/[ß]/g, "ss")
    .normalize("NFC");
}

/**
 * Validate plugin options
 * @param {RehypeHeadingSlugOptions & {
 *   slugRegex: RegExp;
 *   maintainCase: boolean;
 *   duplicateSlugHandling: DuplicateSlugHandling;
 *   invalidSlugHandling: InvalidSlugHandling;
 *   normalizeUnicode: boolean;
 *   trimWhitespace: boolean;
 *   existingIdHandling: ExistingIdHandling;
 *   assignIdToEmptyHeading: boolean;
 *   strictSlugRegex?: boolean;
 * }} options - Options to validate (with required fields)
 * @throws {TypeError} When options are invalid
 */
function validateOptions(options) {
  const validDuplicateOptions = ["numbering", "error"];
  const validInvalidOptions = ["convert", "error"];
  const validExistingIdOptions = ["always", "never", "explicit", "error"];

  const {
    slugRegex,
    maintainCase,
    duplicateSlugHandling,
    invalidSlugHandling,
    normalizeUnicode,
    trimWhitespace,
    existingIdHandling,
    assignIdToEmptyHeading,
    strictSlugRegex = false,
  } = options;

  if (!(slugRegex instanceof RegExp)) {
    throw new TypeError("slugRegex must be a RegExp instance");
  }
  if (typeof maintainCase !== "boolean") {
    throw new TypeError("maintainCase must be a boolean");
  }
  if (!validDuplicateOptions.includes(duplicateSlugHandling)) {
    throw new TypeError('duplicateSlugHandling must be "numbering" or "error"');
  }
  if (!validInvalidOptions.includes(invalidSlugHandling)) {
    throw new TypeError('invalidSlugHandling must be "convert" or "error"');
  }
  if (typeof normalizeUnicode !== "boolean") {
    throw new TypeError("normalizeUnicode must be a boolean");
  }
  if (typeof trimWhitespace !== "boolean") {
    throw new TypeError("trimWhitespace must be a boolean");
  }
  if (!validExistingIdOptions.includes(existingIdHandling)) {
    throw new TypeError(
      'existingIdHandling must be "always", "never", "explicit", or "error"',
    );
  }
  if (typeof assignIdToEmptyHeading !== "boolean") {
    throw new TypeError("assignIdToEmptyHeading must be a boolean");
  }
  if (typeof strictSlugRegex !== "boolean") {
    throw new TypeError("strictSlugRegex must be a boolean");
  }
}

/**
 * Create pre-compiled regex patterns for better performance
 * @param {RegExp} slugRegex - Base slug regex
 * @param {boolean} trimWhitespace - Whether to trim whitespace
 * @param {boolean} strictSlugRegex - Whether to require a capture group
 * @returns {RegexPatterns} Compiled regex patterns
 */
function createRegexPatterns(
  slugRegex,
  trimWhitespace,
  strictSlugRegex = false,
) {
  let basePattern = slugRegex.source.replace(/\$$/, "");

  const hasGroup = /\([^?][^)]*\)/.test(basePattern);
  if (!hasGroup) {
    if (strictSlugRegex) {
      throw new TypeError(
        "slugRegex must contain a capture group ( ... ) when strictSlugRegex is true.",
      );
    }
    basePattern = `(${basePattern})`;
  }

  const trimmedSlugRegex = trimWhitespace
    ? new RegExp(`\\s*${basePattern}\\s*$`)
    : new RegExp(`${basePattern}(?=\\s*$)`);

  const captureMatch = basePattern.match(/^(.+?)\(([^)]+)\)(.*)$/);
  const anySlugPatternSource = captureMatch
    ? `${captureMatch[1]}([\\s\\S]*?)${captureMatch[3]}`
    : basePattern.replace(/\(([^)]+)\)/, "([\\s\\S]*?)");

  const anySlugPattern = trimWhitespace
    ? new RegExp(`\\s*${anySlugPatternSource}\\s*$`)
    : new RegExp(`${anySlugPatternSource}(?=\\s*$)`);

  return {
    trimmedSlugRegex,
    anySlugPattern,
    validSlugPattern: /^[a-zA-Z0-9_\-\u00C0-\uFFFF]+$/,
    whitespaceOnlyPattern: /^\s*$/,
  };
}

/**
 * Process a heading node and assign appropriate id
 * @param {HeadingElement} node - AST heading node
 * @param {ProcessingContext} context - Processing context
 */
function processHeadingNode(node, context) {
  const {
    regexPatterns,
    emptyHeadingCounters,
    slugger,
    invalidSlugger,
    usedSlugs,
    options,
  } = context;

  const headingText = extractHeadingText(node);
  const { explicitSlug, cleanText } = extractExplicitSlug(
    headingText,
    options.slugRegex,
    options.invalidSlugHandling,
    regexPatterns,
  );

  const isEmptyHeading =
    explicitSlug === null &&
    regexPatterns.whitespaceOnlyPattern.test(cleanText);
  if (isEmptyHeading) {
    if (!options.assignIdToEmptyHeading) return;

    const level = node.tagName;
    emptyHeadingCounters[level] = (emptyHeadingCounters[level] || 0) + 1;
    node.properties.id = `${level}-${emptyHeadingCounters[level]}`;
    return;
  }

  if (explicitSlug !== null) {
    updateTextNodes(node, cleanText);
  }

  if (!shouldOverwriteId(node, explicitSlug, options.existingIdHandling)) {
    return;
  }

  const baseSlug = determineBaseSlug(
    explicitSlug,
    cleanText,
    invalidSlugger,
    options.maintainCase,
    options.normalizeUnicode,
    options.trimWhitespace,
    regexPatterns,
  );

  const finalSlug = generateFinalSlug(
    baseSlug,
    slugger,
    usedSlugs,
    options.duplicateSlugHandling,
    options.maintainCase,
  );

  node.properties.id = finalSlug;
}

/**
 * Determine if existing id should be overwritten
 * @param {HeadingElement} node - AST node
 * @param {string|null} explicitSlug - Explicit slug if found
 * @param {ExistingIdHandling} existingIdHandling - Handling strategy
 * @returns {boolean} Whether to overwrite existing id
 */
function shouldOverwriteId(node, explicitSlug, existingIdHandling) {
  const hasExistingId =
    node.properties && typeof node.properties.id === "string";

  if (!hasExistingId) return true;

  switch (existingIdHandling) {
    case "always":
      return true;
    case "never":
      return false;
    case "explicit":
      return explicitSlug !== null;
    case "error":
      throw new Error(
        `Heading already has an id: "${node.properties.id}". Use existingIdHandling option to control this behavior.`,
      );
    /* v8 ignore start */
    default:
      // Defensive: This branch is unreachable because validateOptions ensures existingIdHandling is always a valid value.
      // If this branch is ever reached, it means the validation logic is broken or bypassed.
      return explicitSlug !== null;
    /* v8 ignore stop */
  }
}

/**
 * Check if node is a heading element
 * @param {HastNode} node - AST node
 * @returns {node is HeadingElement} True if node is a heading element
 */
function isHeadingNode(node) {
  return (
    node &&
    node.type === "element" &&
    "tagName" in node &&
    typeof node.tagName === "string" &&
    HEADING_PATTERN.test(node.tagName)
  );
}

/**
 * Extract text content from heading node
 * @param {HeadingElement} node - Heading node
 * @returns {string} Extracted text
 */
function extractHeadingText(node) {
  /**
   * Recursively extract all text from a node and its children.
   * @param {HastNode} n - AST node
   * @returns {string}
   */
  function extract(n) {
    if (n.type === "text") return /** @type {HastText} */ (n).value;
    if (n.type === "element" && "children" in n && Array.isArray(n.children)) {
      return n.children.map(extract).join("");
      /* v8 ignore start */
    }
    // Defensive: This branch is unreachable in normal operation because HAST nodes are always 'text' or 'element'.
    // Only malformed ASTs (not produced by standard HTML parsers) could reach here.
    return "";
    /* v8 ignore stop */
  }
  return extract(node);
}

/**
 * Extract explicit slug from text and clean up the text
 * @param {string} text - Original text
 * @param {RegExp} slugRegex - Regular expression for valid slugs
 * @param {InvalidSlugHandling} invalidSlugHandling - How to handle invalid slugs
 * @param {RegexPatterns} regexPatterns - Pre-compiled regex patterns
 * @returns {ExplicitSlugResult} { explicitSlug: string|null, cleanText: string }
 */
function extractExplicitSlug(
  text,
  slugRegex,
  invalidSlugHandling,
  regexPatterns,
) {
  const validSlugMatch = text.match(regexPatterns.trimmedSlugRegex);
  if (validSlugMatch && validSlugMatch[1]) {
    const cleanText = text.replace(regexPatterns.trimmedSlugRegex, "");
    return {
      explicitSlug: validSlugMatch[1],
      cleanText,
    };
  }

  if (slugRegex.source !== DEFAULT_SLUG_REGEX.source) {
    const defaultPattern = /\s*\{#([a-zA-Z0-9_\-\u00C0-\uFFFF]+)\}\s*$/;
    const defaultMatch = text.match(defaultPattern);
    if (defaultMatch && defaultMatch[1]) {
      const cleanText = text.replace(defaultPattern, "");
      return {
        explicitSlug: defaultMatch[1],
        cleanText,
      };
    }
  }

  const anySlugMatch = text.match(regexPatterns.anySlugPattern);
  if (anySlugMatch) {
    /* v8 ignore start */
    // Defensive: This branch is unreachable in normal operation because createRegexPatterns always constructs
    // anySlugPattern to have a capture group (even if the user-provided slugRegex does not).
    // If the user provides a regex without a capture group, createRegexPatterns forcibly adds one,
    // so anySlugMatch[1] will always exist when anySlugMatch is truthy.
    if (typeof anySlugMatch[1] === "undefined") {
      return {
        explicitSlug: null,
        cleanText: text,
      };
    }
    /* v8 ignore stop */
    const slugCandidate = anySlugMatch[1];

    if (invalidSlugHandling === "error") {
      throw new Error(
        `Invalid explicit slug notation found: {#${slugCandidate}}. Must match pattern: ${slugRegex}`,
      );
    }

    const cleanText = text.replace(regexPatterns.anySlugPattern, "");
    return {
      explicitSlug: slugCandidate,
      cleanText,
    };
  }

  return {
    explicitSlug: null,
    cleanText: text,
  };
}

/**
 * Update text nodes in a heading node with new content
 * @param {HeadingElement} node - Heading node
 * @param {string} newText - New text content
 */
function updateTextNodes(node, newText) {
  /* v8 ignore start */
  if (!node.children || !Array.isArray(node.children)) {
    // NOTE: This condition is unlikely to be reached in normal operation
    // as heading nodes should always have a children array in valid AST
    return;
  }
  /* v8 ignore stop */

  const allText = node.children.every((child) => child.type === "text");
  if (allText) {
    node.children = [{ type: "text", value: newText }];
    return;
  }

  distributeTextProportionally(node, newText);
}

/**
 * Distribute new text content proportionally across text nodes
 * @param {HeadingElement} node - Parent node
 * @param {string} newText - New text to distribute
 */
function distributeTextProportionally(node, newText) {
  let remaining = newText;

  /**
   * @param {HastNode} n - Node to update
   */
  const updateNode = (n) => {
    if (n.type === "text") {
      /* v8 ignore start */
      // Defensive: The following branch is unreachable in normal operation.
      // Reason: distributeTextProportionally is only called when updateTextNodes needs to distribute text across a complex node structure.
      // However, newText (= remaining) is never empty for any valid HTML or AST produced by standard parsing and plugin usage.
      // Only direct AST manipulation with an empty newText could reach here, which does not occur in any real-world or documented usage.
      if (remaining.length === 0) {
        /** @type {HastText} */ (n).value = "";
        return;
      }
      /* v8 ignore stop */

      const originalLength = /** @type {HastText} */ (n).value.length;
      const assignedText = remaining.slice(0, originalLength);
      /** @type {HastText} */ (n).value = assignedText;
      remaining = remaining.slice(assignedText.length);
    } else if (
      n.type === "element" &&
      "children" in n &&
      Array.isArray(n.children)
    ) {
      n.children.forEach(updateNode);
    }
  };

  updateNode(node);
}

/**
 * Determine the base slug
 * @param {string|null} explicitSlug - Explicit slug
 * @param {string} cleanText - Cleaned up text
 * @param {Slugger} invalidSlugger - Slugger for invalid slug conversion
 * @param {boolean} maintainCase - Whether to maintain case
 * @param {boolean} shouldNormalizeUnicode - Whether to apply Unicode normalization
 * @param {boolean} trimWhitespace - Whether to trim whitespace around slug notation
 * @param {RegexPatterns} regexPatterns - Pre-compiled regex patterns
 * @returns {string} Base slug
 */
function determineBaseSlug(
  explicitSlug,
  cleanText,
  invalidSlugger,
  maintainCase,
  shouldNormalizeUnicode,
  trimWhitespace,
  regexPatterns,
) {
  if (explicitSlug === null) {
    return processTextAsSlug(cleanText, shouldNormalizeUnicode, trimWhitespace);
  }

  if (regexPatterns.validSlugPattern.test(explicitSlug)) {
    return explicitSlug;
  }

  return invalidSlugger.slug(explicitSlug, maintainCase);
}

/**
 * Process text content as slug
 * @param {string} text - Text to process
 * @param {boolean} shouldNormalizeUnicode - Whether to normalize Unicode
 * @param {boolean} trimWhitespace - Whether to trim whitespace
 * @returns {string} Processed slug
 */
function processTextAsSlug(text, shouldNormalizeUnicode, trimWhitespace) {
  let normalized = shouldNormalizeUnicode ? normalizeUnicode(text) : text;

  if (trimWhitespace) {
    normalized = normalized
      .replace(UNICODE_WHITESPACE, "-")
      .replace(/^-+|-+$/g, "");

    return normalized.length === 0
      ? /* v8 ignore start */
        // This branch is unreachable because empty headings are handled and returned early in processHeadingNode.
        // The slug generation is skipped for empty headings, so normalized.length === 0 never occurs here in normal operation.
        FALLBACK_SLUG /* v8 ignore stop */
      : normalized;
  }

  return /^\s*$/.test(normalized)
    ? /* v8 ignore next */ FALLBACK_SLUG
    : normalized;
}

/**
 * Generate final slug (including duplicate handling)
 * @param {string} baseSlug - Base slug
 * @param {Slugger} slugger - Main Slugger instance
 * @param {Set<string>} usedSlugs - Set of used slugs
 * @param {DuplicateSlugHandling} duplicateSlugHandling - Duplicate handling method
 * @param {boolean} maintainCase - Whether to maintain case
 * @returns {string} Final slug
 */
function generateFinalSlug(
  baseSlug,
  slugger,
  usedSlugs,
  duplicateSlugHandling,
  maintainCase,
) {
  if (duplicateSlugHandling === "error") {
    const normalizedSlug = new Slugger().slug(baseSlug, maintainCase);

    if (usedSlugs.has(normalizedSlug)) {
      throw new Error(
        `Duplicate slug found: "${normalizedSlug}". Use duplicateSlugHandling: 'numbering' to auto-resolve duplicates.`,
      );
    }

    usedSlugs.add(normalizedSlug);
    return slugger.slug(baseSlug, maintainCase);
  }

  return slugger.slug(baseSlug, maintainCase);
}

/** @type {readonly HeadingLevel[]} */
const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"];
/** @type {RegExp} */
const HEADING_PATTERN = /^h[1-6]$/;
/** @type {RegExp} */
const DEFAULT_SLUG_REGEX = /\{#([a-zA-Z0-9_\-\u00C0-\uFFFF]+)\}$/;
/** @type {string} */
const FALLBACK_SLUG = "---";
/** @type {RegExp} */
const UNICODE_WHITESPACE =
  /[\s\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g;

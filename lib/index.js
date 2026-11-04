import { visit } from "unist-util-visit";
import { slug as githubSlug } from "github-slugger";

/**
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').ElementContent} HastElementContent
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('./index.d.ts').HeadingLevel} HeadingLevel
 * @typedef {import('./index.d.ts').DuplicateSlugHandling} DuplicateSlugHandling
 * @typedef {import('./index.d.ts').InvalidSlugHandling} InvalidSlugHandling
 * @typedef {import('./index.d.ts').ExistingIdHandling} ExistingIdHandling
 * @typedef {import('./index.d.ts').MissingCaptureGroupHandling} MissingCaptureGroupHandling
 * @typedef {import('./index.d.ts').RehypeHeadingSlugOptions} RehypeHeadingSlugOptions
 */

/**
 * Plugin options with deprecated names resolved and defaults applied.
 * @typedef {Object} ResolvedOptions
 * @property {RegExp} pattern
 * @property {MissingCaptureGroupHandling} missingCaptureGroupHandling
 * @property {boolean} maintainCase
 * @property {DuplicateSlugHandling} duplicateSlugHandling
 * @property {InvalidSlugHandling} invalidSlugHandling
 * @property {boolean} normalizeUnicode
 * @property {boolean} trimWhitespace
 * @property {ExistingIdHandling} existingIdHandling
 * @property {boolean} assignIdToEmptyHeading
 */

/**
 * Compiled form of one explicit slug notation.
 * @typedef {Object} Notation
 * @property {RegExp} pattern - The user-facing pattern this notation was derived from
 * @property {RegExp} strict - Matches the notation at the end of the heading text; group 1 is the slug
 * @property {RegExp | null} loose - Like `strict` but accepts any slug between the delimiters;
 *   null when the pattern had no capture group of its own (there are no delimiters to anchor to)
 */

/**
 * Offsets of one text node within the flattened heading text.
 * @typedef {Object} TextSegment
 * @property {number} start
 * @property {number} end
 * @property {boolean} literal - True when the text node sits inside a code-like element
 */

/**
 * An explicit slug notation found at the end of a heading.
 * @typedef {Object} ExplicitSlug
 * @property {string} candidate - The captured slug text
 * @property {string} notation - The notation exactly as written, for messages
 * @property {number} start - Start offset of the text removed from the heading
 * @property {number} end - End offset (exclusive) of the text removed from the heading
 */

/**
 * Everything known about a heading before ids are assigned.
 * @typedef {Object} HeadingEntry
 * @property {HastElement} node
 * @property {string} cleanText - Heading text with the notation removed
 * @property {ExplicitSlug | null} explicit
 * @property {string | null} existingId
 * @property {boolean} keepExistingId - Whether the existing id must be left untouched
 */

/**
 * Tracks the ids assigned (or kept) in one document and makes new ones unique.
 * @typedef {Object} SlugRegistry
 * @property {(id: string) => void} reserve - Mark an id as taken without numbering it
 * @property {(base: string) => string} claim - Return `base`, or `base-n` when `base` is taken
 */

const PACKAGE = "rehype-heading-slug";

/** @type {readonly HeadingLevel[]} */
const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const HEADING_PATTERN = /^h[1-6]$/;

/** Characters allowed in a slug (ASCII letters, digits, `_`, `-`, and U+00C0–U+FFFF). */
const SLUG_CHARACTER_CLASS = "[a-zA-Z0-9_\\-\\u00C0-\\uFFFF]";
const VALID_SLUG = new RegExp(`^${SLUG_CHARACTER_CLASS}+$`);
const DEFAULT_PATTERN = new RegExp(`\\{#(${SLUG_CHARACTER_CLASS}+)\\}$`);

/**
 * Elements whose text is shown literally. Slug notation inside them is left
 * alone (it documents the syntax rather than using it); their text still
 * contributes to automatically generated slugs.
 */
const LITERAL_TEXT_ELEMENTS = new Set(["code", "kbd", "pre", "samp", "tt"]);

const WHITESPACE_ONLY = /^\s*$/;
const WHITESPACE_RUN = /\s+/g;

/**
 * A rehype plugin that adds id attributes to headings (h1-h6).
 *
 * Features:
 * - Explicit slug notation at the end of the heading text: {#custom-slug}
 * - Automatic slug generation from heading text with github-slugger
 * - Optional Unicode normalization of generated slugs
 * - Configurable handling of duplicate slugs, invalid slugs, existing ids,
 *   empty headings, and patterns without a capture group
 *
 * @param {RehypeHeadingSlugOptions | null} [options={}] - Configuration options
 * @returns {(tree: HastRoot) => void} - Unified transformer function
 */
export default function rehypeHeadingSlug(options = {}) {
  if (options !== null && typeof options !== "object") {
    throw new TypeError(
      `${PACKAGE}: options must be an object, null, or undefined`,
    );
  }

  const resolved = resolveOptions(options ?? {});

  // The default notation stays recognised next to a custom pattern.
  const notations = [compileNotation(resolved.pattern, resolved)];
  if (resolved.pattern.source !== DEFAULT_PATTERN.source) {
    notations.push(compileNotation(DEFAULT_PATTERN, resolved));
  }

  return (tree) => {
    const registry = createSlugRegistry(resolved.duplicateSlugHandling);
    const emptyHeadingCounters = /** @type {Record<HeadingLevel, number>} */ (
      Object.fromEntries(HEADING_LEVELS.map((level) => [level, 0]))
    );

    /** @type {HeadingEntry[]} */
    const entries = [];
    visit(tree, "element", (node) => {
      if (HEADING_PATTERN.test(node.tagName)) {
        entries.push(analyzeHeading(node, notations, resolved));
      }
    });

    // Ids that are kept must be known before any id is generated so that
    // generated slugs never collide with them, wherever they appear.
    for (const entry of entries) {
      if (entry.keepExistingId && entry.existingId !== null) {
        registry.reserve(entry.existingId);
      }
    }

    for (const entry of entries) {
      assignId(entry, registry, emptyHeadingCounters, resolved);
    }
  };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Resolve deprecated option names, apply defaults, and validate.
 * @param {RehypeHeadingSlugOptions} options - Raw options from the user
 * @returns {ResolvedOptions} Validated options with defaults applied
 * @throws {TypeError} When an option has an invalid value
 */
function resolveOptions(options) {
  const {
    pattern = DEFAULT_PATTERN,
    missingCaptureGroupHandling = "wrap",
    maintainCase = false,
    duplicateSlugHandling = "numbering",
    invalidSlugHandling = "convert",
    normalizeUnicode = false,
    trimWhitespace = true,
    existingIdHandling = "explicit",
    assignIdToEmptyHeading = false,
  } = resolveDeprecatedOptions(options);

  /** @type {ResolvedOptions} */
  const resolved = {
    pattern,
    missingCaptureGroupHandling,
    maintainCase,
    duplicateSlugHandling,
    invalidSlugHandling,
    normalizeUnicode,
    trimWhitespace,
    existingIdHandling,
    assignIdToEmptyHeading,
  };

  validateOptions(resolved);
  return resolved;
}

/**
 * Map deprecated option names to their current equivalents.
 * A deprecated option is still validated, but the replacement wins when both are given.
 * @param {RehypeHeadingSlugOptions} options - Raw options from the user
 * @returns {RehypeHeadingSlugOptions} Options that only use current names
 * @throws {TypeError} When a deprecated option has an invalid value
 */
function resolveDeprecatedOptions(options) {
  const { slugRegex, strictSlugRegex, ...resolved } = options;

  if (slugRegex !== undefined) {
    warnDeprecatedOption("slugRegex", "pattern");
    if (!(slugRegex instanceof RegExp)) {
      throw new TypeError(`${PACKAGE}: slugRegex must be a RegExp instance`);
    }
    if (resolved.pattern === undefined) {
      resolved.pattern = slugRegex;
    }
  }

  if (strictSlugRegex !== undefined) {
    warnDeprecatedOption("strictSlugRegex", "missingCaptureGroupHandling");
    if (typeof strictSlugRegex !== "boolean") {
      throw new TypeError(`${PACKAGE}: strictSlugRegex must be a boolean`);
    }
    if (resolved.missingCaptureGroupHandling === undefined) {
      resolved.missingCaptureGroupHandling = strictSlugRegex ? "error" : "wrap";
    }
  }

  return resolved;
}

/**
 * Emit a deprecation warning for an option, at most once per option name.
 * Uses `process.emitWarning` when available (Node.js) so that the standard
 * `--no-deprecation` / `--throw-deprecation` flags apply, and falls back to
 * `console.warn` in other environments.
 * @param {string} oldName - Deprecated option name
 * @param {string} newName - Replacement option name
 */
function warnDeprecatedOption(oldName, newName) {
  if (warnedDeprecatedOptions.has(oldName)) return;
  warnedDeprecatedOptions.add(oldName);

  const message = `${PACKAGE}: the \`${oldName}\` option is deprecated. Use \`${newName}\` instead.`;
  const nodeProcess =
    /** @type {{ process?: { emitWarning?: (warning: string, type: string) => void } }} */ (
      globalThis
    ).process;

  if (typeof nodeProcess?.emitWarning === "function") {
    nodeProcess.emitWarning(message, "DeprecationWarning");
  } else {
    console.warn(message);
  }
}

/** @type {Set<string>} */
const warnedDeprecatedOptions = new Set();

/**
 * Validate plugin options.
 * @param {ResolvedOptions} options - Options to validate (with defaults applied)
 * @throws {TypeError} When options are invalid
 */
function validateOptions(options) {
  const validMissingCaptureGroupOptions = ["wrap", "error"];
  const validDuplicateOptions = ["numbering", "error"];
  const validInvalidOptions = ["convert", "error"];
  const validExistingIdOptions = ["always", "never", "explicit", "error"];

  if (!(options.pattern instanceof RegExp)) {
    throw new TypeError(`${PACKAGE}: pattern must be a RegExp instance`);
  }
  if (
    !validMissingCaptureGroupOptions.includes(
      options.missingCaptureGroupHandling,
    )
  ) {
    throw new TypeError(
      `${PACKAGE}: missingCaptureGroupHandling must be "wrap" or "error"`,
    );
  }
  if (typeof options.maintainCase !== "boolean") {
    throw new TypeError(`${PACKAGE}: maintainCase must be a boolean`);
  }
  if (!validDuplicateOptions.includes(options.duplicateSlugHandling)) {
    throw new TypeError(
      `${PACKAGE}: duplicateSlugHandling must be "numbering" or "error"`,
    );
  }
  if (!validInvalidOptions.includes(options.invalidSlugHandling)) {
    throw new TypeError(
      `${PACKAGE}: invalidSlugHandling must be "convert" or "error"`,
    );
  }
  if (typeof options.normalizeUnicode !== "boolean") {
    throw new TypeError(`${PACKAGE}: normalizeUnicode must be a boolean`);
  }
  if (typeof options.trimWhitespace !== "boolean") {
    throw new TypeError(`${PACKAGE}: trimWhitespace must be a boolean`);
  }
  if (!validExistingIdOptions.includes(options.existingIdHandling)) {
    throw new TypeError(
      `${PACKAGE}: existingIdHandling must be "always", "never", "explicit", or "error"`,
    );
  }
  if (typeof options.assignIdToEmptyHeading !== "boolean") {
    throw new TypeError(`${PACKAGE}: assignIdToEmptyHeading must be a boolean`);
  }
}

// ---------------------------------------------------------------------------
// Notation patterns
// ---------------------------------------------------------------------------

/**
 * Derive the regular expressions used to find a slug notation at the end of
 * the heading text from a user-facing pattern.
 *
 * The `g`, `m`, and `y` flags are dropped because the derived expressions are
 * always anchored to the end of the whole text; `i`, `s`, `u`, and `v` are kept.
 * A trailing unescaped `$` in the pattern is removed and re-added after the
 * whitespace handling.
 *
 * @param {RegExp} pattern - User-facing pattern
 * @param {ResolvedOptions} options - Plugin options
 * @returns {Notation} Compiled notation
 * @throws {TypeError} When the pattern has no capture group and missingCaptureGroupHandling is "error",
 *   or when no regular expression can be derived from it
 */
function compileNotation(pattern, options) {
  const flags = pattern.flags.replace(/[gmy]/g, "");
  let source = stripTrailingAnchor(pattern.source);
  let wrapped = false;

  if (countCaptureGroups(source, flags) === 0) {
    if (options.missingCaptureGroupHandling === "error") {
      throw new TypeError(
        `${PACKAGE}: pattern must contain a capture group ( ... ) when missingCaptureGroupHandling is "error".`,
      );
    }
    source = `(${source})`;
    wrapped = true;
  }

  // With trimWhitespace the whitespace after the notation is part of the match
  // (and removed with it); otherwise the notation must only be followed by whitespace.
  const tail = options.trimWhitespace ? "\\s*$" : "(?=\\s*$)";
  const strict = compileRegExp(`${source}${tail}`, flags, pattern);

  let loose = null;
  const group = wrapped ? null : findFirstCaptureGroup(source);
  if (group !== null) {
    const prefix = source.slice(0, group.start);
    const suffix = source.slice(group.end + 1);
    // Accept anything between the delimiters, but never run past another
    // opening delimiter so that only the last notation in the text is matched.
    const body = prefix ? `((?:(?!(?:${prefix}))[\\s\\S])+?)` : "([\\s\\S]+?)";
    loose = compileRegExp(`${prefix}${body}${suffix}${tail}`, flags, pattern);
  }

  return { pattern, strict, loose };
}

/**
 * Remove a trailing end-of-input anchor (`$`) unless it is escaped.
 * @param {string} source - Regular expression source
 * @returns {string} Source without the trailing anchor
 */
function stripTrailingAnchor(source) {
  return source.replace(/(^|[^\\])((?:\\\\)*)\$$/, "$1$2");
}

/**
 * Count the capture groups of a regular expression by letting the engine parse it.
 * @param {string} source - Regular expression source
 * @param {string} flags - Flags to compile with
 * @returns {number} Number of capture groups
 */
function countCaptureGroups(source, flags) {
  const match = new RegExp(`${source}|`, flags).exec("");
  /* v8 ignore next */
  return match === null ? 0 : match.length - 1;
}

/**
 * Locate the first capture group in a regular expression source, honouring
 * escapes, character classes, nesting, and non-capturing/lookaround groups.
 * @param {string} source - Regular expression source
 * @returns {{ start: number, end: number } | null} Offsets of the group's `(` and `)`, or null
 */
function findFirstCaptureGroup(source) {
  let inClass = false;
  let depth = 0;
  let start = -1;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "\\") {
      index++;
    } else if (inClass) {
      if (char === "]") inClass = false;
    } else if (char === "[") {
      inClass = true;
    } else if (char === "(") {
      if (start !== -1) {
        depth++;
      } else if (isCapturingGroupStart(source, index)) {
        start = index;
        depth = 1;
      }
    } else if (char === ")" && start !== -1) {
      depth--;
      if (depth === 0) return { start, end: index };
    }
  }

  /* v8 ignore next */
  return null;
}

/**
 * Whether the `(` at `index` opens a capturing group: a plain group or a named
 * group `(?<name>...)`, but not `(?:...)`, lookahead, or lookbehind.
 * @param {string} source - Regular expression source
 * @param {number} index - Offset of the `(`
 * @returns {boolean} True for a capturing group
 */
function isCapturingGroupStart(source, index) {
  if (source[index + 1] !== "?") return true;
  return (
    source[index + 2] === "<" &&
    source[index + 3] !== "=" &&
    source[index + 3] !== "!"
  );
}

/**
 * Compile a derived regular expression, reporting failures in terms of the user's pattern.
 * @param {string} source - Regular expression source
 * @param {string} flags - Regular expression flags
 * @param {RegExp} pattern - User-facing pattern the source was derived from
 * @returns {RegExp} Compiled regular expression
 * @throws {TypeError} When the source cannot be compiled
 */
function compileRegExp(source, flags, pattern) {
  try {
    return new RegExp(source, flags);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new TypeError(
      `${PACKAGE}: could not derive a regular expression from pattern ${pattern}: ${reason}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Heading analysis
// ---------------------------------------------------------------------------

/**
 * Find the explicit slug of a heading, remove the notation from its text, and
 * decide whether an existing id has to be kept.
 * @param {HastElement} node - Heading element
 * @param {Notation[]} notations - Notations to look for, in order of precedence
 * @param {ResolvedOptions} options - Plugin options
 * @returns {HeadingEntry} Analysis result
 */
function analyzeHeading(node, notations, options) {
  const { text, segments } = flattenHeading(node);
  const explicit = findExplicitSlug(text, segments, notations, options);

  let cleanText = text;
  if (explicit !== null) {
    cleanText = text.slice(0, explicit.start) + text.slice(explicit.end);
    removeTextRange(node, explicit.start, explicit.end, 0);
  }

  const existingId = getExistingId(node);
  const keepExistingId =
    existingId !== null &&
    !shouldOverwriteId(
      existingId,
      explicit !== null,
      options.existingIdHandling,
    );

  return { node, cleanText, explicit, existingId, keepExistingId };
}

/**
 * Concatenate the text of a heading and record where each text node lands in it.
 * Comments and other non-text, non-element children contribute no text.
 * @param {HastElement} node - Heading element
 * @returns {{ text: string, segments: TextSegment[] }} Flattened text and segments
 */
function flattenHeading(node) {
  let text = "";
  /** @type {TextSegment[]} */
  const segments = [];

  /**
   * @param {HastElement} parent - Element whose children are visited
   * @param {boolean} literal - Whether `parent` is inside a code-like element
   */
  function walk(parent, literal) {
    for (const child of parent.children) {
      if (child.type === "text") {
        const start = text.length;
        text += child.value;
        segments.push({ start, end: text.length, literal });
      } else if (child.type === "element") {
        walk(child, literal || LITERAL_TEXT_ELEMENTS.has(child.tagName));
      }
    }
  }

  walk(node, false);
  return { text, segments };
}

/**
 * Look for an explicit slug notation at the end of the heading text.
 * For each notation the strict pattern is tried first, then the loose one
 * (which catches invalid slugs so they can be converted or rejected).
 * @param {string} text - Flattened heading text
 * @param {TextSegment[]} segments - Text node offsets
 * @param {Notation[]} notations - Notations to look for, in order of precedence
 * @param {ResolvedOptions} options - Plugin options
 * @returns {ExplicitSlug | null} The explicit slug, or null when there is none
 * @throws {Error} When the slug is invalid and invalidSlugHandling is "error"
 */
function findExplicitSlug(text, segments, notations, options) {
  for (const notation of notations) {
    const found =
      matchNotation(text, segments, notation, notation.strict, true, options) ??
      (notation.loose === null
        ? null
        : matchNotation(
            text,
            segments,
            notation,
            notation.loose,
            false,
            options,
          ));
    if (found !== null) return found;
  }
  return null;
}

/**
 * Try one derived regular expression against the heading text.
 * @param {string} text - Flattened heading text
 * @param {TextSegment[]} segments - Text node offsets
 * @param {Notation} notation - Notation being matched
 * @param {RegExp} regex - `notation.strict` or `notation.loose`
 * @param {boolean} matchesPattern - Whether `regex` is the strict one
 * @param {ResolvedOptions} options - Plugin options
 * @returns {ExplicitSlug | null} The explicit slug, or null when `regex` does not apply
 * @throws {Error} When the slug is invalid and invalidSlugHandling is "error"
 */
function matchNotation(
  text,
  segments,
  notation,
  regex,
  matchesPattern,
  options,
) {
  const match = regex.exec(text);
  if (match === null) return null;

  const candidate = match[1];
  if (candidate === undefined || candidate === "") return null;

  const written = match[0].trimEnd();
  const notationStart = match.index;
  const notationEnd = match.index + written.length;
  if (overlapsLiteralText(segments, notationStart, notationEnd)) return null;

  if (!matchesPattern || !VALID_SLUG.test(candidate)) {
    if (options.invalidSlugHandling === "error") {
      const reason = matchesPattern
        ? `contains characters outside ${SLUG_CHARACTER_CLASS}`
        : `must match pattern: ${notation.pattern}`;
      throw new Error(
        `${PACKAGE}: Invalid explicit slug notation found: ${written}. The slug "${candidate}" ${reason}`,
      );
    }
  }

  const start = options.trimWhitespace
    ? text.slice(0, match.index).trimEnd().length
    : match.index;

  return {
    candidate,
    notation: written,
    start,
    end: match.index + match[0].length,
  };
}

/**
 * Whether any part of `[start, end)` lies inside a code-like element.
 * @param {TextSegment[]} segments - Text node offsets
 * @param {number} start - Range start
 * @param {number} end - Range end (exclusive)
 * @returns {boolean} True when the range touches literal text
 */
function overlapsLiteralText(segments, start, end) {
  return segments.some(
    (segment) => segment.literal && segment.start < end && segment.end > start,
  );
}

/**
 * Delete the characters in `[rangeStart, rangeEnd)` of the flattened text from
 * the heading's text nodes, in place. Text nodes left empty are removed;
 * elements are kept even when they become empty.
 * @param {HastElement} parent - Element whose children are updated
 * @param {number} rangeStart - Range start in the flattened text
 * @param {number} rangeEnd - Range end (exclusive) in the flattened text
 * @param {number} offset - Flattened offset of `parent`'s first text
 * @returns {number} Flattened offset after `parent`'s last text
 */
function removeTextRange(parent, rangeStart, rangeEnd, offset) {
  /** @type {HastElementContent[]} */
  const kept = [];

  for (const child of parent.children) {
    if (child.type === "text") {
      const start = offset;
      const end = offset + child.value.length;
      offset = end;
      if (end > rangeStart && start < rangeEnd) {
        child.value =
          child.value.slice(0, Math.max(0, rangeStart - start)) +
          child.value.slice(Math.min(child.value.length, rangeEnd - start));
        if (child.value === "") continue;
      }
    } else if (child.type === "element") {
      offset = removeTextRange(child, rangeStart, rangeEnd, offset);
    }
    kept.push(child);
  }

  parent.children = kept;
  return offset;
}

/**
 * Read the existing id of a heading. An empty id counts as no id.
 * @param {HastElement} node - Heading element
 * @returns {string | null} The id, or null
 */
function getExistingId(node) {
  const id = node.properties.id;
  if (id === undefined || id === null) return null;
  const value = String(id);
  return value === "" ? null : value;
}

/**
 * Decide whether an existing id may be replaced.
 * @param {string} existingId - The existing id
 * @param {boolean} hasExplicitSlug - Whether the heading carries explicit slug notation
 * @param {ExistingIdHandling} handling - Strategy
 * @returns {boolean} True when the id may be replaced
 * @throws {Error} When the strategy is "error"
 */
function shouldOverwriteId(existingId, hasExplicitSlug, handling) {
  if (handling === "always") return true;
  if (handling === "never") return false;
  if (handling === "explicit") return hasExplicitSlug;
  throw new Error(
    `${PACKAGE}: Heading already has an id: "${existingId}". Use the existingIdHandling option to control this behavior.`,
  );
}

// ---------------------------------------------------------------------------
// Id assignment
// ---------------------------------------------------------------------------

/**
 * Assign the final id to a heading.
 * @param {HeadingEntry} entry - Analysed heading
 * @param {SlugRegistry} registry - Registry of ids used in the document
 * @param {Record<HeadingLevel, number>} emptyHeadingCounters - Per-level counters for empty headings
 * @param {ResolvedOptions} options - Plugin options
 * @throws {Error} When the slug is a duplicate and duplicateSlugHandling is "error"
 */
function assignId(entry, registry, emptyHeadingCounters, options) {
  if (entry.keepExistingId) return;

  const { node, explicit, cleanText } = entry;

  let base =
    explicit === null
      ? ""
      : githubSlug(explicit.candidate, options.maintainCase);
  if (base === "") {
    base = slugFromText(cleanText, options);
  }
  if (base === "") {
    if (!options.assignIdToEmptyHeading) return;
    const level = /** @type {HeadingLevel} */ (node.tagName);
    emptyHeadingCounters[level] += 1;
    base = `${level}-${emptyHeadingCounters[level]}`;
  }

  node.properties.id = registry.claim(base);
}

/**
 * Generate a slug from heading text.
 * @param {string} text - Heading text without notation
 * @param {ResolvedOptions} options - Plugin options
 * @returns {string} The slug, or "" when the text has nothing to slug
 */
function slugFromText(text, options) {
  if (WHITESPACE_ONLY.test(text)) return "";

  let value = options.normalizeUnicode ? normalizeUnicode(text) : text;
  if (options.trimWhitespace) {
    value = value.trim().replace(WHITESPACE_RUN, "-");
  }

  return githubSlug(value, options.maintainCase);
}

/**
 * Create a registry that numbers duplicate slugs like github-slugger does
 * (`slug`, `slug-1`, `slug-2`, ...), taking reserved ids into account.
 * @param {DuplicateSlugHandling} duplicateSlugHandling - Strategy for duplicates
 * @returns {SlugRegistry} The registry
 */
function createSlugRegistry(duplicateSlugHandling) {
  /** @type {Set<string>} */
  const used = new Set();
  /** @type {Map<string, number>} */
  const counters = new Map();

  return {
    reserve(id) {
      used.add(id);
    },
    claim(base) {
      if (duplicateSlugHandling === "error" && used.has(base)) {
        throw new Error(
          `${PACKAGE}: Duplicate slug found: "${base}". Use duplicateSlugHandling: 'numbering' to auto-resolve duplicates.`,
        );
      }
      let result = base;
      while (used.has(result)) {
        const count = (counters.get(base) ?? 0) + 1;
        counters.set(base, count);
        result = `${base}-${count}`;
      }
      used.add(result);
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Unicode normalization
// ---------------------------------------------------------------------------

/** Latin letters without a canonical decomposition, mapped to ASCII. */
const LATIN_TO_ASCII = /** @type {Record<string, string>} */ ({
  æ: "ae",
  Æ: "AE",
  ø: "o",
  Ø: "O",
  þ: "th",
  Þ: "TH",
  ð: "dh",
  Ð: "DH",
  ß: "ss",
  œ: "oe",
  Œ: "OE",
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ı: "i",
  ħ: "h",
  Ħ: "H",
  ŧ: "t",
  Ŧ: "T",
});
const LATIN_TO_ASCII_PATTERN = new RegExp(
  `[${Object.keys(LATIN_TO_ASCII).join("")}]`,
  "g",
);
/** Combining marks that follow a Latin base letter (after NFD). */
const LATIN_COMBINING_MARKS = /(\p{Script=Latin})[̀-ͯ]+/gu;
const ASCII_ONLY = /^[\x00-\x7f]*$/;

/**
 * Normalize Latin-based accented characters to ASCII equivalents.
 * Other scripts (Cyrillic, Greek, CJK, ...) are left untouched, including
 * their combining marks.
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
function normalizeUnicode(text) {
  if (ASCII_ONLY.test(text)) return text;
  return text
    .normalize("NFD")
    .replace(LATIN_COMBINING_MARKS, "$1")
    .replace(LATIN_TO_ASCII_PATTERN, (char) => LATIN_TO_ASCII[char])
    .normalize("NFC");
}

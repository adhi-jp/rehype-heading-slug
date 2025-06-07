import { rehype } from "rehype";
import rehypeHeadingSlug from "rehype-heading-slug";

/**
 * Helper function to process HTML with the plugin
 * @param {string} html - HTML string to process
 * @param {object} options - rehypeHeadingSlug options
 * @returns {Promise<string>} processed HTML (body content only if present)
 */
export function processHtml(html, options = {}) {
  return rehype()
    .use(rehypeHeadingSlug, options)
    .process(html)
    .then((result) => {
      const htmlString = result.toString();
      const bodyMatch = htmlString.match(/<body>(.*?)<\/body>/s);
      return bodyMatch ? bodyMatch[1] : htmlString;
    });
}

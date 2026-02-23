/**
 * Cleans raw extracted text before it enters the chunker.
 * Handles plain markdown, MDX, and Docusaurus-flavored markdown.
 */
export function normalizeText(raw: string): string {
  let text = raw;

  // Strip YAML frontmatter (--- block at very top)
  text = text.replace(/^---[\s\S]*?---\s*/m, '');

  // Strip MDX import/export statements
  text = text.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');
  text = text.replace(/^export\s+.*$/gm, '');

  // Strip JSX self-closing tags <Component ... />
  text = text.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '');

  // Strip JSX/HTML tags <div ...> and </div>
  text = text.replace(/<[a-zA-Z][^>]*>/g, '');
  text = text.replace(/<\/[a-zA-Z][^>]*>/g, '');

  // Strip JSX expressions {someValue}
  text = text.replace(/\{[^}]*\}/g, '');

  // Strip Docusaurus admonitions :::note :::tip :::warning
  text = text.replace(/^:::[a-z]*\s*$/gm, '');

  // Strip markdown image syntax ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // Strip HTML comments <!-- -->
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Normalize literal \n escape sequences (from bad serialization)
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\t/g, ' ');

  // Strip control characters (keep \n and \t)
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Normalize unicode spaces to regular space
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // Collapse multiple spaces on a single line
  text = text.replace(/[^\S\n]+/g, ' ');

  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // Strip lines that only have spaces
  text = text.replace(/^\s+$/gm, '');

  // Common PDF boilerplate
  text = text.replace(/page \d+ of \d+/gi, '');

  return text.trim();
}
import fs from 'fs';

/**
 * Loads a Markdown file and returns its raw text.
 * Markdown syntax is preserved — the chunker handles it as plain text.
 */
export function loadMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
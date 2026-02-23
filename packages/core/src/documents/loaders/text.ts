import fs from 'fs';

/**
 * Loads a plain text file (.txt) and returns its contents as-is.
 */
export function loadText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
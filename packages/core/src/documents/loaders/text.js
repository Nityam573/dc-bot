import fs from 'fs';
/**
 * Loads a plain text file (.txt) and returns its contents as-is.
 */
export function loadText(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}
//# sourceMappingURL=text.js.map
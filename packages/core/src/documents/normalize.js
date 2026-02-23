/**
 * Cleans raw extracted text before it enters the chunker.
 * Removes control characters, normalizes whitespace, strips boilerplate.
 */
export function normalizeText(raw) {
    return raw
        // Strip control characters (except \n and \t)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
        // Normalize unicode non-breaking / special spaces → regular space
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        // Collapse multiple spaces on a single line
        .replace(/[^\S\n]+/g, ' ')
        // Collapse 3+ consecutive newlines to 2
        .replace(/\n{3,}/g, '\n\n')
        // Common PDF boilerplate
        .replace(/page \d+ of \d+/gi, '')
        .replace(/confidential[^.\n]*internal use only/gi, '')
        .trim();
}
//# sourceMappingURL=normalize.js.map
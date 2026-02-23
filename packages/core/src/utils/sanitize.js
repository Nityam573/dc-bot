/**
 * Sanitizes user input before it is embedded or injected into prompts.
 */
const PROMPT_INJECTION_PATTERNS = [
    /ignore (previous|above|all) instructions?/gi,
    /system prompt/gi,
    /you are now/gi,
    /disregard (all|your|the) (previous|prior|above)/gi,
];
/**
 * Strips control characters, caps length, and blocks common prompt injection attempts.
 */
export function sanitizeUserInput(input) {
    let sanitized = input
        .replace(/[\u0000-\u001F\u007F]/g, '') // control chars
        .trim()
        .slice(0, 2000); // hard length cap
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[redacted]');
    }
    return sanitized;
}
/**
 * Strips HTML tags — useful when cleaning doc content before embedding.
 */
export function stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=sanitize.js.map
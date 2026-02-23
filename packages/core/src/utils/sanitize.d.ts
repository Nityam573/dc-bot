/**
 * Sanitizes user input before it is embedded or injected into prompts.
 */
/**
 * Strips control characters, caps length, and blocks common prompt injection attempts.
 */
export declare function sanitizeUserInput(input: string): string;
/**
 * Strips HTML tags — useful when cleaning doc content before embedding.
 */
export declare function stripHtml(html: string): string;
//# sourceMappingURL=sanitize.d.ts.map
/**
 * Simple time utilities used for performance logging across the pipeline.
 */
/** Returns a stopwatch function. Call it to get elapsed ms since creation. */
export declare function stopwatch(): () => number;
/** Formats a millisecond duration as a human-readable string. */
export declare function formatDuration(ms: number): string;
/** Current unix timestamp in ms */
export declare const now: () => number;
//# sourceMappingURL=time.d.ts.map
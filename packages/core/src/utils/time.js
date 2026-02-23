/**
 * Simple time utilities used for performance logging across the pipeline.
 */
/** Returns a stopwatch function. Call it to get elapsed ms since creation. */
export function stopwatch() {
    const start = Date.now();
    return () => Date.now() - start;
}
/** Formats a millisecond duration as a human-readable string. */
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
/** Current unix timestamp in ms */
export const now = () => Date.now();
//# sourceMappingURL=time.js.map
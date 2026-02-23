/**
 * Simple time utilities used for performance logging across the pipeline.
 */

/** Returns a stopwatch function. Call it to get elapsed ms since creation. */
export function stopwatch(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
  
  /** Formats a millisecond duration as a human-readable string. */
  export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  /** Current unix timestamp in ms */
  export const now = (): number => Date.now();
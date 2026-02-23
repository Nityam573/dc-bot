/**
 * Error signature normaliser.
 *
 * Extracts stable, version-independent identifiers from OCR text so that
 * the same error appearing across different PDF versions or with different
 * line numbers / memory addresses still maps to the same signature.
 *
 * Strategy:
 *   1. Scan each line for known error patterns
 *   2. Strip volatile parts (line numbers, PIDs, memory addresses, UUIDs, timestamps)
 *   3. Lowercase + deduplicate
 */

// ── Pattern catalogue ─────────────────────────────────────────────────────────

/** Regexes that match lines containing errors */
const ERROR_LINE_PATTERNS: RegExp[] = [
  /(?:Error|ERROR|Exception|EXCEPTION|Fatal|FATAL):\s*(.+)/,
  /\[(?:ERROR|FATAL|CRITICAL)\]\s*(.+)/,
  /(?:ERR_[A-Z_0-9]+)(?:\s+(.+))?/,
  /(?:E[0-9]{4,6}):\s*(.+)/,       // E12345 style codes
  /FAILED(?:\s+to\s+|\s*:\s*)(.+)/i,
  /Traceback.*most recent call/i,   // Python tracebacks
  /Caused by:\s*(.+)/,
  /panic:\s*(.+)/,                  // Go panics
  /runtime error:\s*(.+)/i,
];

/** Parts of an error message that change between runs and must be removed */
const VOLATILE_PATTERNS: [RegExp, string][] = [
  // Memory addresses
  [/0x[0-9a-fA-F]{4,}/g,                                    '<addr>'],
  // UUIDs
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>'],
  // ISO timestamps (must run before IP stripping)
  [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<ts>'],
  // Unix epoch (long ints that look like timestamps)
  [/\b1[6-9]\d{9}\b/g,                                      '<ts>'],
  // IPv4 addresses (e.g. 192.168.1.1, 10.0.0.1)
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,             '<ip>'],
  // IPv6 addresses
  [/\b[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){7}\b/g,       '<ipv6>'],
  // Hostnames with port (hostname:PORT) — keep hostname, strip port
  [/([a-zA-Z][\w.-]*):(\d{2,5})\b/g,                       '$1:<port>'],
  // Stack frame line numbers  "at Foo (file.js:42:7)"
  [/:\d+:\d+\)?$/gm,                                        ''],
  [/\bline\s+\d+\b/gi,                                      ''],
  [/\bat\s+\S+:\d+\b/g,                                     ''],
  // Process/thread IDs
  [/\bpid[:=\s]\d+\b/gi,                                    ''],
  [/\btid[:=\s]\d+\b/gi,                                    ''],
  // Plain integers that appear after = or : (likely dynamic values)
  [/(?<=[=:]\s*)\d{5,}/g,                                   '<val>'],
  // File system paths (keep only the filename)
  [/(?:\/[\w.\-@]+){3,}\/(\w[\w.\-]+)/g,                   '<path>/$1'],
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scans OCR text and returns an array of normalised error signatures.
 * Returns [] when no recognisable error patterns are found.
 */
export function extractErrorSignatures(ocrText: string): string[] {
  const lines = ocrText.split('\n');
  const sigs  = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    for (const pattern of ERROR_LINE_PATTERNS) {
      const match = pattern.exec(line);
      if (!match) continue;

      // Use capture group 1 if present, otherwise full match
      const raw = (match[1] ?? match[0]).trim();
      if (!raw) continue;

      const sig = normalise(raw);
      if (sig.length >= 5) sigs.add(sig);
    }
  }

  return [...sigs];
}

/**
 * Strips a single error string down to its stable core.
 * Useful for normalising user-pasted error text from Discord.
 */
export function normaliseErrorString(error: string): string {
  return normalise(error);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  let s = text;
  for (const [pattern, replacement] of VOLATILE_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  // Collapse whitespace and lowercase
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

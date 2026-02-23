// ── Extractors ────────────────────────────────────────────────────────────────
/**
 * Converts raw QueryMatch objects into clean Citation records.
 */
export function extractCitations(chunks) {
    return chunks.map((c, i) => ({
        index: i + 1,
        source: c.source,
        docId: c.docId,
        score: Math.round(c.score * 100) / 100,
    }));
}
/**
 * Appends deduplicated citation footnotes to a response string.
 */
export function appendCitationFooter(text, citations) {
    if (citations.length === 0)
        return text;
    const unique = citations.filter((c, i, arr) => arr.findIndex((x) => x.source === c.source) === i);
    const footer = unique.map((c) => `[${c.index}] ${c.source}`).join('\n');
    return `${text}\n\n**Sources:**\n${footer}`;
}
//# sourceMappingURL=citations.js.map
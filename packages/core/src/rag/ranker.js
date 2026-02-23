/**
 * Lightweight heuristic re-ranker applied after Pinecone vector search.
 *
 * Boosts chunks where:
 *   - Query keywords appear in the chunk text (keyword overlap)
 *   - The chunk is from the start of its source document (likely intro/definition)
 *
 * This is a cheap cross-encoder substitute until query volume justifies the cost
 * of a dedicated reranking model (e.g. Cohere Rerank).
 */
export function rerankChunks(chunks, query) {
    const queryTokens = tokenize(query);
    const scored = chunks.map((chunk) => {
        const chunkTokens = tokenize(chunk.text);
        const overlapScore = keywordOverlap(queryTokens, chunkTokens);
        const positionBoost = chunk.chunkIndex === 0 ? 0.02 : 0;
        const finalScore = chunk.score + overlapScore * 0.1 + positionBoost;
        return { ...chunk, score: Math.min(finalScore, 1.0) };
    });
    return scored.sort((a, b) => b.score - a.score);
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function tokenize(text) {
    return new Set(text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2));
}
function keywordOverlap(queryTokens, chunkTokens) {
    if (queryTokens.size === 0)
        return 0;
    let hits = 0;
    for (const token of queryTokens) {
        if (chunkTokens.has(token))
            hits++;
    }
    return hits / queryTokens.size;
}
//# sourceMappingURL=ranker.js.map
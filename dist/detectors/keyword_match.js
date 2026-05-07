/**
 * Keyword match detector (case-insensitive substring).
 *
 * Used for compliance-style checks: detect terms that should not appear
 * in the content (PII labels, classified markers, banned categories).
 *
 * Scoring (unified direction):
 *   - No blocked term     → 1.0
 *   - Any blocked term    → 0.0
 */
export const keywordMatchDetector = {
    name: "keyword_match",
    evaluate(args, ctx) {
        const a = args;
        const blocked = Array.isArray(a.blocked_terms) ? a.blocked_terms : [];
        if (blocked.length === 0) {
            return { score: 1, evidence: "no blocked_terms configured" };
        }
        const haystack = ctx.request_content.toLowerCase();
        const hits = blocked.filter((t) => haystack.includes(t.toLowerCase()));
        if (hits.length === 0) {
            return { score: 1, evidence: "no blocked terms found" };
        }
        return { score: 0, evidence: `blocked terms matched: ${hits.join(", ")}` };
    },
};
//# sourceMappingURL=keyword_match.js.map
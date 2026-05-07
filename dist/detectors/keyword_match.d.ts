import type { Detector } from "./types.js";
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
export declare const keywordMatchDetector: Detector;
//# sourceMappingURL=keyword_match.d.ts.map
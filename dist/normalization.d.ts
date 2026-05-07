export interface DetectedControlChar {
    index: number;
    code_point: string;
    kind: "zero_width" | "bidi_control";
    name: string;
}
export interface DetectionNormalization {
    raw_content: string;
    normalized_content: string;
    changed: boolean;
    controls: DetectedControlChar[];
}
export declare function normalizeForDetection(raw: string): DetectionNormalization;
//# sourceMappingURL=normalization.d.ts.map
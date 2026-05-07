const CONTROL_NAMES = new Map([
    [0x061c, { kind: "bidi_control", name: "ARABIC LETTER MARK" }],
    [0x180e, { kind: "zero_width", name: "MONGOLIAN VOWEL SEPARATOR" }],
    [0x200b, { kind: "zero_width", name: "ZERO WIDTH SPACE" }],
    [0x200c, { kind: "zero_width", name: "ZERO WIDTH NON-JOINER" }],
    [0x200d, { kind: "zero_width", name: "ZERO WIDTH JOINER" }],
    [0x200e, { kind: "bidi_control", name: "LEFT-TO-RIGHT MARK" }],
    [0x200f, { kind: "bidi_control", name: "RIGHT-TO-LEFT MARK" }],
    [0x202a, { kind: "bidi_control", name: "LEFT-TO-RIGHT EMBEDDING" }],
    [0x202b, { kind: "bidi_control", name: "RIGHT-TO-LEFT EMBEDDING" }],
    [0x202c, { kind: "bidi_control", name: "POP DIRECTIONAL FORMATTING" }],
    [0x202d, { kind: "bidi_control", name: "LEFT-TO-RIGHT OVERRIDE" }],
    [0x202e, { kind: "bidi_control", name: "RIGHT-TO-LEFT OVERRIDE" }],
    [0x2060, { kind: "zero_width", name: "WORD JOINER" }],
    [0x2066, { kind: "bidi_control", name: "LEFT-TO-RIGHT ISOLATE" }],
    [0x2067, { kind: "bidi_control", name: "RIGHT-TO-LEFT ISOLATE" }],
    [0x2068, { kind: "bidi_control", name: "FIRST STRONG ISOLATE" }],
    [0x2069, { kind: "bidi_control", name: "POP DIRECTIONAL ISOLATE" }],
    [0xfeff, { kind: "zero_width", name: "ZERO WIDTH NO-BREAK SPACE" }],
]);
export function normalizeForDetection(raw) {
    const controls = detectControlChars(raw);
    const normalized = stripControlChars(raw.normalize("NFKC"));
    return {
        raw_content: raw,
        normalized_content: normalized,
        changed: raw !== normalized,
        controls,
    };
}
function detectControlChars(raw) {
    const found = [];
    let index = 0;
    for (const ch of raw) {
        const cp = ch.codePointAt(0);
        if (cp !== undefined) {
            const info = CONTROL_NAMES.get(cp);
            if (info) {
                found.push({
                    index,
                    code_point: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
                    kind: info.kind,
                    name: info.name,
                });
            }
        }
        index += 1;
    }
    return found;
}
function stripControlChars(value) {
    let out = "";
    for (const ch of value) {
        const cp = ch.codePointAt(0);
        if (cp === undefined || !CONTROL_NAMES.has(cp)) {
            out += ch;
        }
    }
    return out;
}
//# sourceMappingURL=normalization.js.map
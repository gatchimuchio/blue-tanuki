/**
 * StubBackend: deterministic echo. Used for Phase 0 smoke tests
 * and for offline development when no API key is available.
 */
export class StubBackend {
    name = "stub";
    async call(req) {
        const last = req.messages[req.messages.length - 1];
        const echo = last ? last.content : "(empty)";
        return {
            content: `[STUB:${this.name}] ${echo}`,
            tokens_used: 0,
            model: "stub-v0",
        };
    }
}
//# sourceMappingURL=stub.js.map
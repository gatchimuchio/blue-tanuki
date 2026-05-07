/**
 * Transport abstraction for the Slack channel.
 *
 * The concrete production implementation (BoltTransport) wraps `@slack/bolt`
 * Socket Mode + WebClient. Tests inject a fake transport instead, so the
 * adapter logic in `SlackChannel` (filtering, normalization, dedup) can be
 * exercised without a real Slack workspace.
 */
export {};
//# sourceMappingURL=transport.js.map
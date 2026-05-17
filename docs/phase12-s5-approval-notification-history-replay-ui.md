# Phase 12-S5 - Approval / Notification / History / Replay UI Completion

## Objective

Close the resident Control Center gap for approval, notification, complete-history, and replay visibility without creating a new authority path.

## Scope

- Add a WebChat read-only complete-history replay surface.
- Add Control Center Complete History / Replay display.
- Wire Gateway serve mode to `CompleteHistoryStore`.
- Record safe gateway replay metadata for user input, HDS decisions, approval history, execution history, and final output.
- Keep approval and notification surfaces as existing downstream display/control adapters.

## Boundary

HDS-BRAIN remains the authority owner.

The new history/replay surface:

- uses the normal WebChat inbound bearer token;
- is `GET` only;
- returns `cache-control: no-store`;
- strips raw `payload` from responses;
- exposes digests, ids, hashes, timestamps, kind, actor, and source metadata;
- returns `complete_history_used_for_authority=false`;
- cannot approve, reject, execute, mutate policy, mutate history, or grant authority.

Gateway appends safe replay records. It does not expose command content, schedule content, rendered output, approval tokens, WebChat tokens, credentials, or raw tool/LLM result values through the Control Center history API.

## Implementation Notes

- `packages/channel-webchat` now exposes `WebChatHistorySurface`.
- WebChat handles `GET /history` and `GET /history/replay`.
- WebChat sanitizes the history snapshot before serialization, even if a provider accidentally returns an entry with `payload`.
- Control Center shows Complete History / Replay entries with payload digests and entry hashes.
- `apps/gateway` creates `CompleteHistoryStore` at serve startup.
- Optional JSONL persistence is enabled by `BLUE_TANUKI_COMPLETE_HISTORY_FILE`.
- `BLUE_TANUKI_COMPLETE_HISTORY_MAX_ENTRIES` can cap in-process history retention.

## Safety Notes

- Complete history remains separate from the HDS audit chain.
- Output audit still occurs before final user-visible channel dispatch.
- Approval Queue still uses the resume token plus request-bound one-time approval token.
- Notification Center remains display-only.
- History replay is evidence only and cannot feed authority, approval, or risk classification.

## Validation

Required checks for this phase:

```bash
pnpm --filter @blue-tanuki/channel-webchat test
pnpm --filter @blue-tanuki/channel-webchat build
pnpm --filter @blue-tanuki/gateway test
pnpm --filter @blue-tanuki/gateway build
pnpm typecheck
pnpm test
pnpm docs:check
pnpm build
pnpm validate:packaging
pnpm hds:standalone
pnpm run doctor
```

`pnpm run doctor` may require local WebChat and channel token env values; missing required tokens are configuration failures, not code failures.

## Acceptance Criteria

- Control Center includes Complete History / Replay.
- `/history` and `/history/replay` require the inbound token.
- `/history` and `/history/replay` reject mutation methods.
- History replay responses do not include raw payload values.
- Gateway history projection is digest/metadata only.
- `complete_history_used_for_authority=false` is preserved.
- Approval and notification behavior is unchanged.
- Relevant tests and docs are updated.

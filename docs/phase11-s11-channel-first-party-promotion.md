# Phase 11-S11 Channel First-Party Promotion

Phase 11-S11 adds a first-party promotion gate for external channels without
promoting unsupported channels by assertion.

## Implemented

- Added `pnpm validate:channels`.
- Added `scripts/channel_promotion_gate.ts`.
- Added tests that reject unsupported Slack / Teams / WhatsApp promotion and
  accept Slack only with complete owner evidence.
- Added `docs/CHANNEL_PROMOTION_GATE.md`.
- Updated channel readiness, credential readiness, conformance, release, and
  permanent-use docs.

## Promotion Decision

WebChat and Telegram remain the only current `v1.0` first-party channels.

Slack, Discord, Teams, and LINE remain `first-party-preview`. They have
adapter conformance, typed delivery errors, retry/backoff, and live-smoke skip
paths, but this workspace does not have owner-provided live credentials or test
targets. The gate therefore keeps them preview until real owner evidence is
provided.

Teams and LINE also still require gateway-owned inbound listener closure before
first-party promotion.

WhatsApp remains `reserved-third-party`.

## Safety Boundary

The promotion gate is downstream release governance. It does not change
HDS-BRAIN, Approval Gate, Runtime Invariants, executor behavior, channel
adapters, or credential semantics.

Channel metadata and live-smoke evidence remain non-authority.

## Validation Added

- `apps/gateway/test/channel_promotion_gate.test.ts`
- `pnpm validate:channels`

## Next Phase

Active execution lane advances to Phase 11-S12 Plugin Review Gate
Implementation.

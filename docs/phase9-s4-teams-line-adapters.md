# Phase 9-S4 - Teams / LINE Preview Adapters

## Objective

Add Microsoft Teams and LINE as first-party-preview target adapters without changing the HDS authority path.

## Implemented Surface

- `@blue-tanuki/channel-teams`
  - outbound Microsoft Graph chatMessage send
  - targets: `channel/<team_id>/<channel_id>`, `reply/<team_id>/<channel_id>/<message_id>`, `chat/<chat_id>`
  - credential: `MICROSOFT_GRAPH_ACCESS_TOKEN`
- `@blue-tanuki/channel-line`
  - outbound LINE Messaging API push
  - target: reachable LINE userId, groupId, or roomId
  - credential: `LINE_CHANNEL_ACCESS_TOKEN`
- Gateway registration through plugin manifests and capability enforcement.
- Live smoke skip path through `TEAMS_LIVE_TARGET` and `LINE_LIVE_TARGET`.
- Adapter conformance tests for inbound normalization, canonical outbound payloads, and silent fail-closed behavior.

## Safety Boundary

Teams and LINE are downstream adapters. Service metadata, tenant ids, channel ids, chat ids, LINE source ids, delivery ids, and API error metadata are context or audit evidence only.

They cannot:

- escalate actor authority,
- change ApprovalRisk or ApprovalLevel,
- bypass final-review,
- grant tool capabilities,
- act as HDS-BRAIN authority input.

## Failure Modes

Missing credentials fail closed in silent mode:

- Teams: `teams_not_configured`
- LINE: `line_not_configured`

Provider errors are returned as typed downstream delivery results with `error_kind`, `error_code`, optional `retry_after_ms`, and `next_action`.

## Remaining Preview Gate

First-party promotion requires owner-run credentialed live smoke, real setup verification, and permanent-use recovery review for tenant/app consent, target management, token rotation, and webhook/subscription listener behavior.

WhatsApp remains reserved-third-party and outside first-party core.

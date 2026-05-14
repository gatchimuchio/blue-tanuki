# Phase 11-S7 Daily Operator Implementation

## Purpose

Phase 11-S7 implements the first-party Daily Operator as a Layer A surface without moving authority into cron, Google services, schedule state, or channel metadata.

## Implementation Summary

- Added `@blue-tanuki/operator-daily` as a workspace package.
- Added operation specs for Daily Brief status, Google read summaries, runtime schedule list/create/update/delete, reminder drafting, Google writes, and Daily Brief channel-send.
- Preserved `BLUE_TANUKI_DAILY_BRIEF_*` environment compatibility through a redacted Daily Brief snapshot helper.
- Added HDS-BRAIN frame recognition for Daily Operator requests.
- Added Daily Operator state to the WebChat runtime snapshot.
- Added WebChat Control Center endpoints for `GET /operators/daily` and `POST /operators/daily/invoke`.

## Authority Boundary

Daily Operator is a downstream device under HDS-BRAIN.

It does not:

- allow cron to become an authority source
- use Google metadata as authority
- activate schedule mutation without the existing L3 final-review path
- expose schedule content in snapshots
- create new raw Google, email, schedule, or channel-send capability
- bypass existing channel-send and Approval Gate paths

## Daily Brief Compatibility

The existing environment variables remain the compatibility surface:

- `BLUE_TANUKI_DAILY_BRIEF_ENABLED`
- `BLUE_TANUKI_DAILY_BRIEF_CHANNEL`
- `BLUE_TANUKI_DAILY_BRIEF_TARGET`
- `BLUE_TANUKI_DAILY_BRIEF_CONTENT`
- `BLUE_TANUKI_DAILY_BRIEF_TIME`
- `BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS`
- `BLUE_TANUKI_DAILY_BRIEF_GOOGLE_*`

The operator snapshot records only safe metadata: enabled state, channel, target presence, timing, Google source state, and service names.

## Approval Mapping

| Operation | ApprovalLevel | ApprovalRisk | Final Review |
|---|---|---|---|
| `daily_brief.status` | `L1_observe` | low | no |
| `google.gmail.read` | `L1_observe` | low | no |
| `google.calendar.read` | `L1_observe` | low | no |
| `google.drive.read` | `L1_observe` | low | no |
| `schedule.list` | `L1_observe` | low | no |
| `reminder.draft` | `L2_operate` | medium | no |
| `schedule.create` | `L3_final_review` | high | yes |
| `schedule.update` | `L3_final_review` | high | yes |
| `schedule.delete` | `L3_final_review` | high | yes |
| `gmail.write` | `L3_final_review` | high | yes |
| `google.calendar.write` | `L3_final_review` | high | yes |
| `google.drive.write` | `L3_final_review` | high | yes |
| `daily_brief.channel_send` | existing channel path | contextual | existing path |

## Runtime Snapshot

Gateway runtime snapshot now exposes `operator_surfaces.daily` with:

- Daily Brief safe metadata
- safe `scheduled_tasks` snapshots
- safe `runtime_schedules` snapshots
- operation boundary specs

WebChat also exposes:

- `GET /operators/daily` for a read-only Daily Operator snapshot
- `POST /operators/daily/invoke` for HDS-routed invocation through the existing inbound handler

Both endpoints use the existing inbound bearer token. Invoke stamps gateway-internal surface metadata and still enters HDS-BRAIN through the normal inbound request path.

## Conformance Evidence

- `packages/operator-daily/test/daily.test.ts`
- `packages/hds-brain/test/operator_surface.test.ts`
- `packages/channel-webchat/test/webchat.test.ts`
- `apps/gateway/test/plugin_loader.test.ts`

These cover surface registration, Daily Brief env compatibility, L1/L2/L3 boundaries, schedule mutation final-review declaration, metadata non-escalation, and permission-enforced surface loading.

## Cross-References

- [Daily Operator](operator-surfaces/DAILY_OPERATOR.md)
- [Shared Operator Substrate](operator-surfaces/SHARED_SUBSTRATE.md)
- [Conformance](CONFORMANCE.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)

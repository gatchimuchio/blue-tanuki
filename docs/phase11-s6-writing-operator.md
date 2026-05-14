# Phase 11-S6 Writing Operator Implementation

## Purpose

Phase 11-S6 implements the first-party Writing Operator as a Layer A surface without adding a new authority path.

## Implementation Summary

- Added `@blue-tanuki/operator-writing` as a workspace package.
- Added a package manifest for the Writing Operator surface.
- Added operation specs for in-memory drafting, proofreading, summarization, translation, sandboxed file read/write/edit, Gmail write, and Google Drive write.
- Added digest-only invocation helpers and gateway-owned metadata helpers.
- Added HDS-BRAIN frame recognition for Writing Operator requests.
- Added Gateway plugin-loader support for first-party surface exports.
- Added Writing Operator state to the WebChat runtime snapshot.
- Added WebChat Control Center endpoints for `GET /operators/writing` and `POST /operators/writing/invoke`.

## Authority Boundary

Writing Operator is a downstream device under HDS-BRAIN.

It does not:

- call an LLM from HDS-BRAIN
- create a new raw file, network, credential, or external write capability
- replace Approval Gate decisions
- bypass L3 final-review
- accept untrusted channel metadata as authority

## Approval Mapping

| Operation | ApprovalLevel | ApprovalRisk | Final Review |
|---|---|---|---|
| `draft.in_memory` | `L1_observe` | low | no |
| `proofread.in_memory` | `L1_observe` | low | no |
| `summarize.in_memory` | `L1_observe` | low | no |
| `translate.in_memory` | `L1_observe` | low | no |
| `file.read` | `L1_observe` | low | no |
| `file.write` | `L2_operate` | medium | no |
| `file.edit` | `L2_operate` | medium | no |
| `gmail.write` | `L3_final_review` | high | yes |
| `google.drive.write` | `L3_final_review` | high | yes |

## Audit Impact

Writing operation specs identify the audit fields each path must carry:

- surface identifier
- source type
- downstream tool name
- LLM input/output digest
- path metadata for file operations
- external target summary for Gmail/Drive writes
- ApprovalLevel / ApprovalRisk / final-review result

The helper package stores invocation content as SHA-256 digests only.

## Runtime Snapshot

Gateway runtime snapshot now exposes `operator_surfaces.writing` with the surface name, Layer A status, enabled state, and downstream-authority classification.

WebChat also exposes:

- `GET /operators/writing` for a read-only Writing Operator snapshot
- `POST /operators/writing/invoke` for HDS-routed invocation through the existing inbound handler

Both endpoints use the existing inbound bearer token. Invoke stamps gateway-internal surface metadata and still enters HDS-BRAIN through the normal inbound request path.

## Conformance Evidence

- `packages/operator-writing/test/writing.test.ts`
- `packages/hds-brain/test/operator_surface.test.ts`
- `apps/gateway/test/plugin_loader.test.ts`
- `packages/channel-webchat/test/webchat.test.ts`

These cover surface registration, L1/L2/L3 operation boundaries, digest-only invocation traces, plugin permission enforcement for surface exports, and HDS-BRAIN surface framing without authority escalation.

## Cross-References

- [Writing Operator](operator-surfaces/WRITING_OPERATOR.md)
- [Shared Operator Substrate](operator-surfaces/SHARED_SUBSTRATE.md)
- [Conformance](CONFORMANCE.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)

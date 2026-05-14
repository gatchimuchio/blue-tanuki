# Phase 11-S8 Developer Operator Implementation

## 1. Purpose

Phase 11-S8 implements Developer Operator as the third v1.0 first-party Layer A operator surface.

The surface groups existing downstream developer tools without adding raw authority:

- local file read/write/edit
- GitHub read/write
- shell execution
- browser snapshot and browser automation preview

## 2. Implementation Summary

Added `packages/operator-developer/` with:

- `blue-tanuki.plugin.json`
- operation specs
- required permission declarations
- read-only surface snapshot export
- digest-only invocation helpers
- conformance tests

Gateway integration now loads the surface through the existing plugin manifest permission checks and exposes it through:

- runtime snapshot field `operator_surfaces.developer`
- `GET /operators/developer`
- `POST /operators/developer/invoke`

HDS-BRAIN now recognizes Developer Operator binding from:

- `developer:` / `/developer` / `operator:developer` content prefixes
- gateway-owned metadata with `blue_tanuki.authority_context=gateway_internal_v1`

## 3. Approval Boundary

Developer Operator does not change Approval Gate policy. It declares the existing boundaries:

| Operation | ApprovalLevel | ApprovalRisk | Final review |
|---|---|---|---|
| file.read | L1_observe | low | no |
| github.read | L1_observe | low | no |
| file.write / file.edit | L2_operate | medium | no |
| browser.snapshot | L2_operate | medium | no |
| github.write | L3_final_review | high | yes |
| browser.automation | L3_final_review | high | yes |
| shell.exec | L3_final_review | high | yes |

Browser automation remains preview and disabled-by-default behind `BLUE_TANUKI_BROWSER_AUTOMATION_PREVIEW=1`.

## 4. Authority and Layer Boundary

Developer Operator is a Layer A downstream device.

It does not:

- replace HDS-BRAIN authority
- add a developer-mode bypass
- add raw filesystem, process, GitHub, or browser capability
- promote browser automation to first-party release quality
- weaken final-review for shell, GitHub write, or browser automation

Layer B plugins may extend developer workflows with templates or analyzers, but they cannot widen the underlying file, shell, GitHub, browser, approval, or audit boundaries.

## 5. Runtime Exposure

The Gateway runtime snapshot exposes safe Developer Operator metadata only. The WebChat endpoints use the existing inbound bearer token and route invocation through the existing inbound handler.

Invocation metadata is gateway-owned:

```txt
blue_tanuki.authority_context=gateway_internal_v1
blue_tanuki.operator_surface=developer
```

Untrusted external metadata cannot select or escalate the operator surface.

## 6. Conformance Coverage

Added or extended tests for:

- Developer surface Layer A/downstream declaration
- L1 / L2 / L3 operation boundary declaration
- browser automation preview disabled-by-default
- digest-only invocation traces
- no authority bypass capability declaration
- HDS-BRAIN Developer Operator framing
- authenticated WebChat `/operators/developer` display and invoke endpoints

## 7. Safety Review

The following remain unchanged:

- HDS-BRAIN containment property
- final-review boundary for shell and external write operations
- browser automation preview quarantine
- audit hash-chain model
- Runtime Invariants
- Layer A / Layer B separation

## 8. Cross-References

- [Developer Operator Spec](operator-surfaces/DEVELOPER_OPERATOR.md)
- [Shared Operator Substrate](operator-surfaces/SHARED_SUBSTRATE.md)
- [Conformance](CONFORMANCE.md)
- [Browser Automation Preview](phase8-s6-browser-automation-preview.md)
- [GitHub Write](phase8-s4-github-write.md)
- [GA Bar Definition](GA_BAR_DEFINITION.md)

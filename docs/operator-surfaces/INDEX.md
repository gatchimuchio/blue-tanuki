# First-Party Operator Surfaces

## 1. Purpose

This directory defines the v1.0 GA first-party operator surfaces:

- Writing Operator
- Daily Operator
- Developer Operator

The three surfaces are equal. Their implementation order in Phase 11-S6, Phase 11-S7, and Phase 11-S8 is scheduling convenience only, not strategic priority.

## 2. Scope (in-scope user goals)

The operator surfaces give the owner coherent task entry points for writing work, daily operational work, and developer work while preserving HDS-BRAIN authority.

Each surface is a Layer A module. Each surface uses existing downstream tools and shared substrate rather than creating raw authority.

## 3. Non-Goals (out-of-scope user goals)

- creating a new authority path
- replacing HDS-BRAIN
- bypassing Approval Gate
- bypassing audit
- introducing raw filesystem, shell, network, credential, or external-write capability
- making Layer B plugins replace first-party surfaces
- adding new surfaces in v1.0 GA

## 4. Required Downstream Tools (existing tools)

The surfaces reuse existing tools:

- LLM downstream command route
- `file.*`
- `shell.*`
- `github.read`
- `github.write`
- `gmail.read`
- `gmail.write`
- `google.calendar.read`
- `google.calendar.write`
- `google.drive.read`
- `google.drive.write`
- `cron.process`
- `schedule.*`
- `channel_send`
- `browser.snapshot`
- `browser.automation`

## 5. Approval Levels per Operation (L1/L2/L3 ApprovalLevel + ApprovalRisk)

Surface specs define operation-level ApprovalLevel and ApprovalRisk. As a default:

- L1 observe: read-only, no-op, or safe local drafting
- L2 operate: bounded local state changes outside final-review operations
- L3 final-review: external writes, shell execution, settings writes, credential access, schedule create/update/delete, GitHub writes, Google writes, and browser automation actions that can mutate or use credentials

## 6. Audit Trace Requirements (authority trace items)

Every surface operation must preserve:

- request id
- actor/process identity
- surface name
- downstream tool name
- ApprovalLevel and ApprovalRisk
- final-review decision where applicable
- safe result digest for writes or external actions

## 7. Failure Modes (owner next action)

Failures must say:

- what failed
- whether anything was changed
- whether retry is safe
- which credential/config/sandbox/audit condition blocked the operation
- what the owner should do next

## 8. Layer Boundary (Layer A vs Layer B)

The three surfaces are Layer A first-party modules. Layer B plugins may extend a surface through declared plugin and capability boundaries, but they may not replace the first-party surface or create a parallel authority path.

## 9. Shared Substrate Usage

All surfaces use [SHARED_SUBSTRATE.md](SHARED_SUBSTRATE.md):

- HDS-BRAIN authority path
- Approval Gate
- hash-chain audit
- Runtime Invariants
- channel adapter downstream I/O

## 10. Conformance Test Requirements (Phase 11-S6/S7/S8 target)

Implementation phases must add conformance coverage for:

- surface registration
- L1/L2/L3 approval mapping
- final-review bypass prevention
- audit trace completeness
- capability envelope preservation
- Layer A / Layer B non-bypass

## 11. Cross-References

- [Shared Substrate](SHARED_SUBSTRATE.md)
- [Writing Operator](WRITING_OPERATOR.md)
- [Daily Operator](DAILY_OPERATOR.md)
- [Developer Operator](DEVELOPER_OPERATOR.md)
- [Strategy Frame](../STRATEGY_FRAME.md)
- [GA Bar Definition](../GA_BAR_DEFINITION.md)
- [Conformance](../CONFORMANCE.md)
- [Capability Envelope](../CAPABILITY_ENVELOPE.md)

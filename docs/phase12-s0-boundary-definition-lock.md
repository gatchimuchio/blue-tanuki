# Phase 12-S0: Boundary Definition Lock

## Objective

Phase 12-S0 fixes HDS-BRAIN's decision boundary before output audit, complete history, runtime invariant evidence, and resident UI work continue.

## Implemented

- Added `packages/hds-brain/src/boundary_policy.ts` as a standalone deterministic boundary module.
- Added `packages/hds-brain/test/boundary_policy.test.ts`.
- Mapped command-level `tool.call` and `unknown` to high-risk `L3_final_review`.
- Added five boundary documents:
  - `docs/hds-brain-risk-approval-boundary.md`
  - `docs/hds-brain-reference-boundary.md`
  - `docs/hds-brain-fail-safe-policy.md`
  - `docs/hds-brain-unknown-escalation-policy.md`
  - `docs/hds-brain-trinity-m-policy-model.md`

## Locked Boundaries

- L1/L2/L3 are workflow levels, not severity levels.
- Risk classification is deterministic and not delegated to LLMs, tools, plugins, channels, or metadata.
- Memory, complete history, session history, tool results, LLM output, external metadata, and UI projections are reference/evidence only.
- Unknown, ambiguous, unclassified, missing capability, version mismatch, and conflict states do not auto-allow.
- HDS-BRAIN health or authority prerequisite failure suspends downstream execution.
- Trinity `M` is a deterministic policy model: identity, boundary, judgement, log, and suspend rules.

## Non-Goals

- OutputAudit implementation
- CompleteHistoryStore implementation
- runtime invariant evidence upgrade
- resident Approval/History/Replay UI work
- detector lifecycle implementation

## Next

Next phase is Phase 12-S1: HDS-BRAIN Output / Result Audit Plane.

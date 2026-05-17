# Phase 12-S3: Runtime Invariants Evidence Upgrade

## Objective

Upgrade Runtime Invariants from fixed display values to HDS-BRAIN-owned evidence that can be inspected, verified, and audited.

## Implemented

- Added `packages/hds-brain/src/runtime_invariants.ts`.
- Added `RuntimeInvariantEvidenceReport`, per-invariant evidence items, all-ok status, and report digest.
- Added `runtime_invariants` to `HDSRuntimeSnapshot` while preserving legacy `invariants`.
- Added `runtime_invariants` HDS audit record type.
- Added `HDSUpperController.onRuntimeInvariantsEvidence`.
- Added standalone harness output for runtime invariant evidence.
- Gateway records startup runtime invariant evidence and exposes the report through runtime snapshot.
- Audit dump and authority trace can project runtime invariant evidence without turning it into authority.
- Added tests for evidence reports, failed evidence, audit-chain append, and gateway status evaluation.

## Locked Boundaries

- Runtime Invariants evidence lives in `packages/hds-brain`.
- Gateway runtime snapshot is a downstream display/integration surface.
- Evidence records are audit material only.
- Evidence and audit records carry non-authority flags.
- A failed invariant must not create fallback authority.

## Non-Goals

- final-review operation single-source refactor
- fail-safe/self-health policy redesign
- Control Center visual redesign
- detector lifecycle changes
- gateway authority ownership
- policy mutation based on runtime evidence

## Validation

Primary S3 coverage:

```bash
pnpm --filter @blue-tanuki/hds-brain test
pnpm --filter @blue-tanuki/gateway test
pnpm --filter @blue-tanuki/channel-webchat test
```

Full phase validation is recorded in the final report for the phase commit.

## Next

Next phase is Phase 12-S4: Final-review Operation Single Source of Truth.

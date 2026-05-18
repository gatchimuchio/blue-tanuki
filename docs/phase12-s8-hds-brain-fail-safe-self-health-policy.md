# Phase 12-S8 - HDS-BRAIN Fail-safe / Self-health Policy

## Objective

Make HDS-BRAIN self-health an executable fail-safe boundary, not only a diagnostic display.

## Scope

- Extend self-health with explicit authority preconditions.
- Connect self-health to `evaluateFailSafeBoundary()`.
- Block new command emission when self-health is fail-safe.
- Block human resume approval through fail-safe suspensions.
- Add audit-visible fail-safe decision reasons and triggered thresholds.
- Add regression tests for runtime invariant failure, invalid policy, broken audit chain, and non-resumable fail-safe suspension.

## Non-Goals

- changing `ApprovalRisk`
- adding `critical`
- changing Approval Gate UX
- adding gateway-owned authority checks
- making Runtime Invariants authority
- adding external watchdogs or service managers
- resuming resident application integration in the same phase

## Fail-safe Preconditions

Downstream command execution requires:

- HDS-BRAIN available
- policy structurally valid
- audit chain valid
- Runtime Invariants valid
- Approval Gate available
- memory chain valid when memory is configured

Any failed precondition produces:

```txt
decision=SUSPEND
command=null
command_execution_allowed=false
downstream_execution_allowed=false
```

## Audit Shape

Fail-safe decisions include:

```txt
hds_fail_safe:suspend
hds_fail_safe:<precondition>=false
```

The decision log includes bounded self-health metadata under:

```txt
log.model.structure.self_health
```

No raw secrets, memory payloads, history payloads, or downstream output are stored there.

## Validation

Required checks for this phase:

```bash
pnpm --filter @blue-tanuki/hds-brain test -- fail_safe_self_health boundary_policy standalone_boundary runtime_invariants controller
pnpm --filter @blue-tanuki/hds-brain test
pnpm typecheck
pnpm test
pnpm docs:check
pnpm build
pnpm validate:packaging
pnpm hds:standalone
pnpm run doctor
```

`pnpm run doctor` may fail when required local tokens are intentionally absent. For release validation, rerun with dummy env values or real operator credentials and report the exact result.

## Acceptance Criteria

- Self-health reports failed preconditions and next action.
- Failed Runtime Invariants suspend before command emission.
- Invalid policy suspends before normal policy evaluation.
- Broken audit chain suspends later decisions.
- Fail-safe suspension cannot be approved through human resume.
- Existing boundary, controller, Runtime Invariants, standalone, and compound attack tests still pass.

## Next Boundary

Phase 12-S8 closes the HDS-BRAIN quality lock sequence at a natural audit boundary. The next implementation lane can resume Phase 11-S10 Resident Application Integration.

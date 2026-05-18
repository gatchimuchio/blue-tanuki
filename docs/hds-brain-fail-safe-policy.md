# HDS-BRAIN Fail-safe Policy

Phase 12-S0 locks the fail-safe boundary for HDS-BRAIN health and authority prerequisites.

Phase 12-S8 makes the boundary executable inside HDS-BRAIN self-health.

## Healthy Preconditions

Downstream execution is allowed only when all are true:

- HDS-BRAIN is available
- policy is valid
- audit chain is valid
- runtime invariants are valid
- Approval Gate is available
- memory chain is valid when a memory store is configured

If any precondition is false, the safe behavior is `SUSPEND`.

## Fail-safe Behavior

When fail-safe triggers:

- no new downstream command execution is allowed
- no approval bypass is allowed
- human resume cannot approve through the fail-safe suspension
- no fallback authority path is created
- result/history/memory/tool output cannot substitute HDS-BRAIN
- the failure reason must be visible in audit/status output when available

Fail-safe is not a denial of the operator. It is a refusal to continue without a valid authority path.

## Self-health Surface

`evaluateHDSBrainHealth()` returns:

- failed preconditions
- command/downstream execution allow flags
- fail-safe reason
- operator next action
- `used_for_authority=false`

`HDSUpperController` checks self-health before command emission. If self-health is fail-safe, the controller records a `SUSPEND` decision with `hds_fail_safe:*` thresholds and emits no command.

Fail-safe suspensions are not human-resumable. The operator must repair the failed precondition and retry the request through the normal authority path.

## Recovery Boundary

Recovery may repair configuration, policy, audit storage, runtime invariants, or Approval Gate availability. Recovery must not silently relax authority behavior.

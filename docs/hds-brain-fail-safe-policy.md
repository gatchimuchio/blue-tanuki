# HDS-BRAIN Fail-safe Policy

Phase 12-S0 locks the fail-safe boundary for HDS-BRAIN health and authority prerequisites.

## Healthy Preconditions

Downstream execution is allowed only when all are true:

- HDS-BRAIN is available
- policy is valid
- audit chain is valid
- runtime invariants are valid
- Approval Gate is available

If any precondition is false, the safe behavior is `SUSPEND`.

## Fail-safe Behavior

When fail-safe triggers:

- no new downstream command execution is allowed
- no approval bypass is allowed
- no fallback authority path is created
- result/history/memory/tool output cannot substitute HDS-BRAIN
- the failure reason must be visible in audit/status output when available

Fail-safe is not a denial of the operator. It is a refusal to continue without a valid authority path.

## Recovery Boundary

Recovery may repair configuration, policy, audit storage, runtime invariants, or Approval Gate availability. Recovery must not silently relax authority behavior.

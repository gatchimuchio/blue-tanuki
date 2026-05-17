# HDS-BRAIN Trinity M Policy Model

Phase 12-S0 maps the Trinity `M` layer into HDS-BRAIN as a policy boundary, not as a new authority source.

## Mapping

HDS-BRAIN uses the triadic closure shape:

```text
W := (X, R, M)
```

For BLUE-TANUKI:

- `X`: request, actor, process, target scope, log scope
- `R`: frame/model/detector relations and declared downstream command envelope
- `M`: identity rules, boundary conditions, judgement rules, log rules, suspend rules

`M` is implemented as deterministic policy, approval, detector, audit, and suspend rules. It is not LLM output, memory, session history, channel metadata, or plugin metadata.

## Closure Rule

If `X`, `R`, or `M` is missing or ambiguous, the result is not authority. HDS-BRAIN suspends until the missing boundary is explicit.

## Non-authority Rule

The fact that a triadic model can be described does not grant authority. It is a closure/checking method. It cannot be used to rank persons, bypass owner review, or turn reference material into authority.

## Test Surface

`packages/hds-brain/src/boundary_policy.ts` exposes:

- `TRINITY_M_POLICY_MODEL`
- `evaluateTrinityMClosure`

The tests assert that missing `M` suspends.

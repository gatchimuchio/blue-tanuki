# HDS-BRAIN Unknown Escalation Policy

Phase 12-S0 locks the rule:

```text
unknown must not auto-allow.
unknown must escalate.
```

## Escalation Inputs

These conditions escalate to L3 or SUSPEND:

- unknown operation
- ambiguous operation
- unclassified capability
- missing tool capability
- policy version mismatch
- history reference ambiguity
- approval grant ambiguity
- external metadata conflict
- detector conflict
- detector unknown pattern

## Command-level Rule

If an executable command exists but its operation resolves to `tool.call` or `unknown`, Approval Gate treats it as high-risk L3. Full access and reusable grants do not auto-allow it.

## Detector Lifecycle Rule

If detector lifecycle cannot be proven `ok`, HDS-BRAIN suspends before normal score thresholds. Missing detectors, detector exceptions, invalid detector scores, duplicate/conflicting axes, and unknown detector patterns cannot be interpreted as safe detector output.

## No-command Rule

If the condition prevents deterministic command construction, HDS-BRAIN suspends instead of creating a speculative command.

## Downstream Rule

Downstream devices may report ambiguous or unknown feedback, but that feedback is audit evidence only. It cannot classify itself as safe or authorize its own continuation.

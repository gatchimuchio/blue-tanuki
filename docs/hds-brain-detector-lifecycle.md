# HDS-BRAIN Detector Lifecycle

Detector lifecycle is HDS-BRAIN-owned policy evidence. It is not supplied by an LLM, tool, channel, plugin, UI, memory, history, or executor.

## Lifecycle States

Each `AxisScore` carries a lifecycle trace:

- `ok` - detector was registered and returned a valid score in `[0, 1]`
- `missing_detector` - policy references a detector that is not registered
- `detector_exception` - detector threw during evaluation
- `invalid_output` - detector returned `NaN`, infinity, or a score outside `[0, 1]`
- `unknown_pattern` - detector configuration contains an unknown or invalid pattern
- `detector_conflict` - detector/policy structure conflicts, such as duplicate policy axes

## Escalation Rule

Any lifecycle state other than `ok` is treated as unknown escalation:

```txt
decision=SUSPEND
risk=high
approval_level=L3_final_review
auto_allow=false
```

This lifecycle escalation runs before normal score thresholds. A detector configuration problem must not be converted into `ASSERT`, `OUT_OF_SCOPE`, or silent continuation just because the aggregate score would otherwise pass.

## Unknown Pattern Rule

Invalid detector patterns are not ignored. For example, an invalid `risk_keyword.danger_patterns` regex produces:

```txt
lifecycle.status=unknown_pattern
escalation_reason=detector_unknown_pattern
decision=SUSPEND
```

The detector may expose bounded evidence such as the number of invalid patterns, but it must not treat an invalid pattern list as safe.

## Audit Shape

Lifecycle traces are included in the HDS decision log under:

```txt
log.model.scoring.axis_scores[].lifecycle
```

The commit reason and triggered thresholds include:

```txt
unknown_escalation:<reason>
detector_lifecycle:<axis>:<status>
```

This is deterministic HDS audit material. It does not create a downstream authority path.

## Non-Goals

- adding LLM-based classification
- allowing detectors to call network, tools, plugins, memory, or UI
- adding a new `ApprovalRisk` level
- changing full-access behavior
- converting detector evidence into reusable approval
- letting detector updates bypass L3 final review

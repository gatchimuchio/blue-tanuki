# Phase 12-S7 - Detector Lifecycle and Unknown Pattern Escalation

## Objective

Lock detector lifecycle failures and unknown detector patterns into fail-closed HDS-BRAIN decisions.

## Scope

- Add lifecycle traces to detector axis scores.
- Treat missing detectors, detector exceptions, invalid detector output, unknown patterns, and detector conflicts as unknown escalation.
- Ensure lifecycle escalation returns `SUSPEND` before normal threshold rules.
- Stop invalid `risk_keyword` regex patterns from being silently ignored.
- Add regression tests for detector lifecycle and unknown pattern escalation.
- Document the detector lifecycle boundary and conformance requirement.

## Non-Goals

- adding LLM-based detector fallback
- changing the `ApprovalRisk` axis
- adding `critical`
- changing full-access default
- changing Approval Gate UX
- implementing Phase 12-S8 fail-safe / self-health policy
- adding gateway-owned detector authority

## Required Outcomes

Detector lifecycle failures must produce:

- `decision=SUSPEND`
- `unknown_escalation:<reason>` in triggered thresholds
- `detector_lifecycle:<axis>:<status>` in triggered thresholds
- no command envelope
- hash-chain-verifiable audit entries

Unknown detector patterns must use `detector_unknown_pattern` and must not become `ASSERT`.

## Validation

Required checks for this phase:

```bash
pnpm --filter @blue-tanuki/hds-brain test -- detectors detector_lifecycle boundary_policy controller
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

- Detector lifecycle traces are present in `AxisScore`.
- Missing detectors suspend rather than crash or auto-allow.
- Detector exceptions suspend rather than crash the authority path.
- Invalid detector scores suspend.
- Invalid regex patterns are classified as `unknown_pattern`.
- Duplicate policy axes suspend as detector conflicts.
- Existing approval, boundary, runtime invariant, history, and compound attack tests still pass.

# Phase 12-S6 - Root Full-access + Compound Attack Scenario Tests

## Objective

Lock the root full-access posture against compound attack chains.

This phase is test-first hardening. It does not add new authority, new tools, new channels, or new approval modes.

## Scope

- Add regression tests for wildcard `full_access` grants against privileged tool envelopes.
- Add metadata-spoof tests for owner / approval impersonation attempts.
- Add process-policy tests for forged channel-send metadata.
- Add suspended-request tests proving executor feedback cannot lift a human gate.
- Add reference-boundary tests for complete-history authority conversion and history updates.

## Non-Goals

- changing the `ApprovalRisk` axis
- adding `critical`
- adding a new runtime policy
- changing full-access default
- changing Approval Gate UX
- adding detector lifecycle implementation
- adding fail-safe self-health policy

## Covered Scenarios

The new test file covers:

- `tool.shell.exec`
- `schedule.create`
- `schedule.delete`
- `github.write`
- `google.write`
- `browser.automation`
- wildcard `full_access` grants
- untrusted metadata attempting `actor_kind=owner`
- untrusted metadata attempting `process_kind=approval`
- forged gateway channel-send metadata
- downstream feedback claiming owner approval while a request is suspended
- complete-history reference-to-authority conversion
- history update classification

## Required Outcomes

All privileged envelopes must remain:

- `risk=high`
- `approval_level=L3_final_review`
- `final_review_required=true`
- `decision=ask`

Full access and reusable/wildcard grants must not bypass these outcomes.

## Safety Notes

This phase deliberately keeps full access as the owner-operated default. The tested boundary is not "less access"; it is "no final-review bypass, no metadata authority, no downstream self-resume, no history authority."

## Validation

Required checks for this phase:

```bash
pnpm --filter @blue-tanuki/hds-brain test -- compound_attack_scenarios
pnpm --filter @blue-tanuki/hds-brain test
pnpm typecheck
pnpm test
pnpm docs:check
pnpm build
pnpm validate:packaging
pnpm hds:standalone
pnpm run doctor
```

`pnpm run doctor` may warn or fail when optional credentials are intentionally absent. For release validation, rerun with dummy optional env values or real operator credentials and report the exact result.

## Acceptance Criteria

- Compound attack scenario tests exist.
- Tests cover root full-access plus wildcard approval grants.
- Tests cover metadata spoofing and downstream feedback spoofing.
- Tests cover complete-history/history authority conversion.
- Existing Approval Gate and Runtime Invariants behavior remains unchanged.
- Validation passes or any environment-limited failure is reported explicitly.

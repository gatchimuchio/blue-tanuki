# HDS-BRAIN Runtime Invariants Evidence

Phase 12-S3 turns Runtime Invariants from a fixed display tuple into a standalone evidence report owned by HDS-BRAIN.

## Boundary

Runtime Invariants are evaluated inside `packages/hds-brain`.

They must not depend on:

- gateway
- executor
- LLM backend
- tool implementation
- UI / Control Center
- channel adapter
- plugin loader
- external API client

Gateway and Control Center are downstream display surfaces. They may show the report and include it in runtime snapshots, but they cannot rewrite it or use it as authority.

## Evidence Report

`RuntimeInvariantEvidenceReport` contains:

- schema version
- generation timestamp
- current invariant values
- per-invariant evidence items
- structural/runtime guarantee classification
- all-ok status
- report digest
- `runtime_invariants_used_for_authority=false`

Each evidence item records expected value, actual value, pass/fail status, guarantee kind, evidence text, and `used_for_authority=false`.

## Invariant Keys

The current invariant set is:

- `hds_calls_llm=false`
- `process_policy_enforced=true`
- `external_metadata_can_escalate_authority=false`
- `memory_used_for_authority=false`
- `complete_history_used_for_authority=false`
- `final_review_boundary_enforced_by_approval_gate=true`

The legacy `runtime_snapshot.invariants` values remain for compatibility, but `runtime_snapshot.runtime_invariants` is the evidence-bearing surface.

## Audit Rule

HDS-BRAIN can append a `runtime_invariants` audit record to the hash-chain.

The audit record stores:

- all-ok status
- report digest
- evidence count
- invariant values
- full report
- reason
- `used_for_authority=false`

This makes Runtime Invariants inspectable as audit evidence without making them an authority source.

## Non-authority Rule

Runtime Invariants evidence is not a policy editor, approval substitute, or privilege source.

It must not:

- decide authority
- approve commands
- bypass final review
- rewrite policy / detectors / approval state
- infer owner consent
- turn downstream metadata into authority

If evidence reports a failed invariant, the safe operational response is fail-safe inspection and remediation, not downstream fallback authority.

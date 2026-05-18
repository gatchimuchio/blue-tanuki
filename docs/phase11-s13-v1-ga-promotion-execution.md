# Phase 11-S13 - v1.0 GA Promotion Execution

## Objective

Execute the GA promotion lane up to the owner decision boundary without
violating the repository rule that public GA claims and `1.0.0` promotion
require explicit owner GO.

## Implemented Surface

- `scripts/ga_promotion_gate.ts` implements the GA promotion preflight.
- `pnpm validate:ga` validates GA Bar A-F evidence and Bar G owner-decision
  state.
- `apps/gateway/test/ga_promotion_gate.test.ts` covers pre-GO readiness,
  forbidden public claim activation, version promotion without GO, actual
  promotion mode, and valid owner GO evidence.
- `docs/v1.0-ga-promotion-review.md` records the current pre-GO evidence pack.

## Current Decision State

`PENDING_OWNER_GO`

The repository is pre-GO ready, but actual `1.0.0` promotion is blocked until
the owner explicitly records GO.

Current machine boundary:

```txt
status=pre_go_ready
owner_go=pending
public_claim_allowed=false
```

## Safety Boundary

This phase does not:

- promote package versions to `1.0.0`
- activate public GA launch claims
- weaken preview quarantine
- promote Slack / Discord / Teams / LINE to first-party
- alter HDS-BRAIN authority
- alter Approval Gate behavior
- alter Runtime Invariants

The gate fails if pre-GO public claim language appears in README, QUICKSTART,
or CLAIM.

## Actual GO Procedure

After owner review, actual GA promotion requires:

1. Owner decision evidence at `docs/ga-owner-decision.json`.
2. Workspace version promotion to `1.0.0`.
3. Approved public claim language updates.
4. Release bundle regeneration and verification.
5. Full validation including:

```bash
pnpm validate:ga -- --require-owner-go
```

## Validation

Required S13 pre-GO validation:

- `pnpm test -- apps/gateway/test/ga_promotion_gate.test.ts`
- `pnpm validate:ga`
- `pnpm docs:check`
- `pnpm validate:packaging`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm validate:channels`
- `pnpm plugin:review -- --package packages/channel-slack --bundled`
- `pnpm smoke:live`
- `pnpm run doctor`
- `pnpm release:bundle -- --dry-run`
- `pnpm release:bundle`
- `pnpm release:verify`
- `pnpm hds:standalone`
- `pnpm smoke:serve`
- `pnpm smoke:resume`

## Next Phase

Actual `1.0.0` promotion remains pending explicit owner GO.

# Phase 5-S6: Resume Token Split

Phase 5-S6 separates WebChat inbound authentication from human resume
authentication. `WEBCHAT_TOKEN` remains the token for `/inbound` and
`/ws-ticket`; `WEBCHAT_RESUME_TOKEN` is now required for `/resume`.

## Delivered

- Added `WEBCHAT_RESUME_TOKEN` as a required serve-mode secret.
- Rejected configurations where `WEBCHAT_RESUME_TOKEN` is missing, shorter
  than the WebChat token minimum, or equal to `WEBCHAT_TOKEN`.
- Scoped WebChat bearer checks by endpoint:
  - `/inbound` accepts only the inbound token.
  - `/ws-ticket` accepts only the inbound token.
  - `/resume` accepts only the resume token.
- Added `ResumeAuditTrace` to HDS-BRAIN decision logs for human resume actions.
- Recorded resume `actor` and `token_kind` in approve / reject / block audit
  entries.
- Extended the WebChat plugin manifest permission envelope with
  `secrets:WEBCHAT_RESUME_TOKEN`.
- Extended `doctor` to check resume-token presence and separation without
  logging either secret value.

## Not Added

- One-time approval tokens shipped later in Phase 5-S10.
- No dynamic permission changes.
- No relaxation of the containment property.

## Containment Notes

Human resume remains an upstream HDS-BRAIN state transition. The WebChat layer
only authenticates the request and forwards `{ request_id, verdict }` plus audit
context. LLM providers do not approve, reject, or resume suspended work.

## Verification

- `pnpm --filter @blue-tanuki/channel-webchat typecheck`: PASS
- `pnpm --filter @blue-tanuki/channel-webchat test`: PASS, 40 tests
- `pnpm --filter @blue-tanuki/hds-brain typecheck`: PASS
- `pnpm --filter @blue-tanuki/hds-brain test`: PASS, 72 tests
- `pnpm --filter @blue-tanuki/gateway typecheck`: PASS
- `pnpm --filter @blue-tanuki/gateway test`: PASS, 57 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 311 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "hello phase5-s6"`: PASS

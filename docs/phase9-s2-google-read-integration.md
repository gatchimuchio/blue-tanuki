# Phase 9-S2: Google Read Integration

Phase 9-S2 adds read-only Google utility without changing the authority model.

## Added surface

- `gmail.read`: bounded Gmail message metadata summaries.
- `google.calendar.read`: bounded Calendar event metadata summaries.
- `google.drive.read`: bounded Drive file metadata/search summaries.
- Optional Daily Brief Google source for Gmail / Calendar / Drive read summaries.

## Safety boundary

- Google read tools are downstream tools only.
- Google metadata is not authority.
- OAuth tokens are never returned in tool output, runtime snapshots, or audit summaries.
- Missing tokens fail closed before a request is sent.
- Credential-backed Google read commands map to `credential.access` and L3 final-review.
- Daily Brief Google source stays on the existing trusted cron lane and emits a dynamic `payload_hash`.

## Explicit non-goals

- No Gmail draft create or send.
- No Calendar create/update/delete.
- No Drive file write/delete/share.
- No autonomous cross-service action.

## Validation coverage

- Built-in tool registration and capability declarations.
- Fixed Google API host routing.
- Missing-token fail-closed behavior.
- Daily Brief dynamic source metadata and snapshot content redaction.
- Doctor checks for opt-in Google Daily Brief configuration.

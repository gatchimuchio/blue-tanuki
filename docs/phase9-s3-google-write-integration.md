# Phase 9-S3: Google Write Integration

Phase 9-S3 adds bounded Google write tools without changing the authority model.

## Added surface

- `gmail.write`
  - `draft.create`
  - `message.send`
  - `draft.send`
- `google.calendar.write`
  - `event.create`
  - `event.update`
  - `event.delete`
- `google.drive.write`
  - `file.create`
  - `file.update`

## Safety boundary

- Google write tools are downstream tools only.
- Google metadata and mutation results are not authority.
- All Google write tools map to `google.write`, `high` risk, and `L3_final_review`.
- Full access and reusable approval grants cannot bypass final review.
- OAuth tokens are never returned in tool output, runtime snapshots, or audit summaries.
- Missing tokens and invalid required args fail before a request is sent.
- Calendar writes force `sendUpdates=none`.
- Drive writes are bounded by `max_content_bytes`.

## Explicit non-goals

- No Calendar attendee invites.
- No Drive delete/share.
- No autonomous cross-service action.
- No unbounded upload/write path.

## Validation coverage

- Built-in tool registration and capability declarations.
- Fixed Google API host routing and mutation methods.
- Missing-token fail-closed behavior.
- Google write L3 final-review mapping.
- Plugin manifest permission coverage.

# Phase 5-S5: Unicode Normalization + Raw Audit Retention

Status: implemented.

## Intent

Detector input is now protected from Unicode control-character evasion while
audit keeps the original raw request content. Raw input is never discarded
before audit.

## Implemented

- Added `normalizeForDetection()` in `packages/hds-brain/src/normalization.ts`.
- Applies NFKC normalization before detector scoring.
- Removes zero-width and bidi control characters from detector input.
- Records detected control characters with:
  - code point
  - kind (`zero_width` / `bidi_control`)
  - name
  - raw content character index
- Adds `DecisionLog.input` with:
  - `raw_content`
  - `normalized_content`
  - `changed`
  - `controls`
- `risk_keyword` and `keyword_match` now receive the normalized detector
  content through the existing model/scoring path.
- Resume audit entries preserve the original normalization trace.
- Downstream command payloads still use the original request content; this step
  only changes detector input and audit traceability.

## Not Added

- No channel-layer normalization.
- No mutation of `InboundRequest`.
- No LLM involvement.
- No semantic rewriting beyond NFKC and control-character removal.

## Verification

- `pnpm --filter @blue-tanuki/hds-brain typecheck`: PASS
- `pnpm --filter @blue-tanuki/hds-brain test`: PASS, 72 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 305 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "please run r<U+200B>m -rf foo"`: PASS, SUSPEND

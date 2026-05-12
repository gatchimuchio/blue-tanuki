# Phase 8-S6 - Browser Automation Preview

## Objective

Add headless browser automation as a disabled-by-default preview without changing the authority model.

## Implemented

- Added `browser.snapshot` for bounded headless page snapshots.
- Added `browser.automation` for guarded preview browser actions.
- Added explicit opt-in through `BLUE_TANUKI_BROWSER_AUTOMATION_PREVIEW=1`.
- Added a smoke skip path through `tool:browser.automation action=smoke`.
- Added `browser.snapshot` / `browser.automation` HDS routing and capability envelopes.
- Added Approval Gate mapping:
  - `browser.snapshot` -> `browser.snapshot`, medium risk, `L2_operate`.
  - `browser.automation` -> `browser.automation`, high risk, `L3_final_review`.
- Added plugin manifest permissions for preview browser capabilities.

## Preview Boundary

This is not release-quality remote browser control.

The preview rejects:

- credentials
- cookies
- storage state
- custom headers
- uploads
- downloads
- non-public network targets
- side-effect actions that are not yet contained by release-quality tests

`browser.automation` currently supports:

```text
tool:browser.automation action=smoke
tool:browser.automation action=navigate url=https://example.com
```

Side-effect actions such as `click`, `form_submit`, `upload`, and `download` remain quarantined and return `mutation_sent=false`.

## Sandbox Policy

- No persistent browser profile.
- No credential reuse.
- Downloads disabled.
- Browser process receives only a reduced safe environment.
- Returned output is bounded page metadata/text, not cookies, tokens, storage state, or screenshots.

## Network Policy

`browser.snapshot` and the enabled `browser.automation` navigate path use the same public-address and `BLUE_TANUKI_HTTP_ALLOWLIST` checks as `http.fetch`.

Localhost, link-local, private, loopback, multicast, documentation, and other non-public address ranges are denied.

## Resource Limits

- Maximum timeout: 15 seconds.
- Maximum returned text: 20,000 characters.
- Default returned text: 8,000 characters.
- Fixed preview viewport: 1280 x 720.
- No multi-step action plan support in this phase.

## Audit / Authority Impact

Browser automation is downstream executor work only. It is not authority. HDS-BRAIN remains the upper control layer, Approval Gate remains the final-review boundary, and executor feedback remains audit evidence only.

## Smoke Skip Path

When the preview env flag is absent:

```text
tool:browser.automation action=smoke
```

returns `status=skipped`, `enabled=false`, and `safe_to_ignore=true`.

## Remaining Limitations

- Playwright must be installed in a preview environment for real headless execution.
- Credentialed browser sessions are intentionally unsupported.
- Click, form submit, upload, and download are intentionally quarantined.
- This preview does not replace `browser.read` for lightweight public page reading.

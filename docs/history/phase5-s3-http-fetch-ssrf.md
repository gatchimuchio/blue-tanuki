# Phase 5-S3: http.fetch SSRF Hardening

Status: implemented.

## Intent

`http.fetch` remains a read-only GET/HEAD tool, but it now only reaches
externally routable HTTP(S) targets. Internal networks, metadata services, and
redirect escapes are denied before the request is sent.

## Implemented

- Resolves the target hostname before connecting.
- Denies non-public IP ranges, including:
  - loopback
  - RFC1918 private IPv4
  - link-local
  - cloud metadata addresses such as `169.254.169.254`
  - unique-local IPv6
  - IPv4-mapped IPv6 bypass forms
- Connects through `http` / `https` with a pinned DNS lookup result, keeping
  the original `Host` / TLS server name separate from the resolved address.
- Follows redirects manually, with a hard limit of 3 hops.
- Re-runs URL, allowlist, DNS, and IP validation for every redirect target.
- Keeps the existing bounded response output behavior through `max_bytes`.
- Adds optional domain allowlist mode through `BLUE_TANUKI_HTTP_ALLOWLIST`.

## Not Added

- No new runtime dependency.
- No broad browser-like fetch behavior.
- No POST/PUT/DELETE support.
- No bypass for local development targets. Local URLs are intentionally denied.

## Verification

- `pnpm --filter @blue-tanuki/core typecheck`: PASS
- `pnpm --filter @blue-tanuki/core test`: PASS, 67 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 299 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:echo text=ssrf-guard-smoke"`: PASS

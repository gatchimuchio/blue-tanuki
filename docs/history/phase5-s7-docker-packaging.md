# Phase 5-S7: Docker Packaging

Phase 5-S7 adds the first deployable container boundary for BLUE-TANUKI without
changing runtime behavior or adding npm dependencies.

## Delivered

- Added a multi-stage `Dockerfile`.
- Added `.dockerignore` to keep local dependencies, build output, logs, zips,
  and env files out of the build context.
- Added `docker-compose.yml` for local and single-host deployment.
- The container runs `apps/gateway/dist/main.js --serve` directly.
- Runtime defaults:
  - `WEBCHAT_HOST=0.0.0.0`
  - `WEBCHAT_PORT=8787`
  - persistent data under `/data`
- Compose requires both `WEBCHAT_TOKEN` and `WEBCHAT_RESUME_TOKEN`.
- Compose wires `BLUE_TANUKI_AUDIT_DIR=/data/audit` and
  `BLUE_TANUKI_SESSION_DIR=/data/sessions`.
- The runtime image uses a non-root `blue-tanuki` user.
- The container healthcheck probes `/healthz`.

## Not Added

- No external npm dependencies.
- No Redis/Postgres persistence backend.
- No GitHub Actions CI.
- No systemd unit.
- No change to plugin loading, permission enforcement, or HDS containment.

## Usage

```bash
WEBCHAT_TOKEN=replace-me \
WEBCHAT_RESUME_TOKEN=replace-me-too \
docker compose up --build
```

Then check:

```bash
curl http://127.0.0.1:8787/healthz
```

For production, set long random token values through the host secret manager or
deployment environment. Do not bake secrets into the image.

## Verification

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 311 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- Docker CLI was not available in the local Codex environment, so
  `docker build` was not executed here.

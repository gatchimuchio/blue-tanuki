# Phase 6-S2: local settings window

Phase 6-S2 adds a dependency-free local settings surface. It is served by the
existing WebChat HTTP server and is meant to become the backend for a later
desktop wrapper.

## Delivered

- Added `/settings` HTML window to WebChat.
- Added `/settings/config` JSON API.
- Added dedicated `BLUE_TANUKI_SETTINGS_TOKEN` bearer auth for settings API.
- Settings surface is loopback-only by default; when `WEBCHAT_HOST` is non-loopback (for example `0.0.0.0`), `/settings` is disabled unless `BLUE_TANUKI_ENABLE_SETTINGS=1` is explicitly set.
- Added redacted settings snapshots:
  - LLM provider/model/endpoint
  - API-key presence only
  - WebChat bind settings
  - file/session/audit paths
  - plugin manifest names/kinds/permissions
- Added env-file persistence for settings updates when
  `BLUE_TANUKI_ENV_FILE` or `--env-file` is configured.
- Settings updates write the env file and require process restart to take
  effect.
- Added tests for WebChat settings endpoints and gateway settings persistence.

## Usage

Generate a local env file:

```bash
pnpm setup -- --yes
```

Boot with the env file:

```bash
pnpm gateway:serve:dev -- --env-file .blue-tanuki/blue-tanuki.env
```

Open:

```text
http://127.0.0.1:8787/settings
```

Use the `BLUE_TANUKI_SETTINGS_TOKEN` value from the generated env file.

When binding WebChat to a non-loopback host, settings stay disabled by default.
Enable them only by setting `BLUE_TANUKI_ENABLE_SETTINGS=1` and treating the
settings token as an administrative secret.

## Boundaries

- The settings page never receives raw API-key values from the snapshot API.
- The settings surface is local-only unless explicitly enabled for a non-loopback bind.
- Saving an empty API-key field leaves the existing key unchanged.
- Runtime LLM/provider state is not hot-reloaded.
- Plugin permissions, HDS-BRAIN decisions, and boot-time containment checks
  remain authoritative.

## Not Added

- No Tauri/Electron desktop shell yet.
- No OS keychain integration yet.
- No signed OS installers yet.
- No live LLM connection test button yet.
- No new npm dependencies.

## Verification

- WebChat settings endpoint tests: PASS
- Gateway settings/setup tests: PASS
- Full typecheck by package: PASS
- Full test suite: PASS, 335 tests
- Full build by package: PASS
- Settings-window serve smoke: PASS
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `validate:packaging`: PASS
- `doctor`: PASS, exit 0 with dummy settings-token env

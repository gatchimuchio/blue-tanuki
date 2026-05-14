# BLUE-TANUKI Update / Rollback / Recovery Runbook

BLUE-TANUKI does not currently implement an automatic updater. Updates are operator-run source or release-bundle replacements, followed by validation.

## Distribution readiness gate

`doctor` validates that installer docs, update/rollback guidance,
uninstall/purge guidance, and release bundle checks remain present. Treat a
`distribution_readiness` error as a release blocker. Fix the listed docs or
scripts, then rerun `pnpm run doctor` and `pnpm validate:packaging`.

The Phase 11-S9 guided first-run installer is part of this gate. It is a
portable setup wrapper, not a signed native installer and not an automatic
updater. If `pnpm installer:run` fails, keep the existing env file and `.bak`
files in place, fix the reported preflight/setup/doctor issue, and rerun:

```bash
pnpm installer:verify
pnpm installer:run -- --no-serve
```

Use the Control Center Settings `Verify LLM` action before saving any provider,
endpoint, model, or API key change after update.

## 1. Before Update

1. Stop the gateway if it is running.
2. Record the current commit or release bundle name.
3. Back up local config and data:
   - env file
   - env `.bak` files
   - `BLUE_TANUKI_AUDIT_DIR`
   - `BLUE_TANUKI_SESSION_DIR`
   - `BLUE_TANUKI_MEMORY_DIR`
   - `BLUE_TANUKI_SCHEDULES_DIR`
   - `BLUE_TANUKI_APPROVALS_FILE`
4. Run audit verification:

```bash
node apps/gateway/dist/main.js --audit-verify
```

If audit verification fails, stop the update and handle audit recovery first.

## 2. Source Install Update

```bash
git status --short
git pull
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm run doctor
```

Then start with the same env file as before:

```bash
pnpm gateway:serve -- --env-file .blue-tanuki/blue-tanuki.env
```

## 3. Release Bundle Update

1. Verify the downloaded archive and sidecars.
2. Extract to a new app directory when possible.
3. Preserve the existing env file and local data directories.
4. Run install/setup only if the bundle path requires it.
5. Run `doctor` before start.

```bash
pnpm release:verify -- --file <bundle>
pnpm run doctor
```

Portable installers preserve env/config by default during force reinstall. Use reset options only for intentional config regeneration:

- Windows: `-ResetConfig`
- macOS/Linux: `RESET_CONFIG=1`

## 4. Config Preservation

Do not overwrite these unless intentionally resetting:

- `WEBCHAT_TOKEN`
- `WEBCHAT_RESUME_TOKEN`
- `BLUE_TANUKI_SETTINGS_TOKEN`
- LLM provider settings
- audit/session/memory/schedule paths
- approval grants path

If setup or settings writes a new env file, confirm the `.bak` exists before deleting anything.

## 5. Audit / Session / Memory Preservation

- Audit is evidence. Keep it unless deliberately purging the installation.
- Session history is downstream LLM continuity. Losing it should not affect authority.
- Memory is not authority. Losing it should not grant or remove permission.
- Runtime schedule store controls future actions; back it up and validate it after update.

## 6. Rollback

### Source rollback

```bash
git status --short
git log --oneline -5
git switch main
git pull
```

Use the previously recorded commit or backup branch according to local policy, then rerun:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm run doctor
```

### Release bundle rollback

1. Stop gateway.
2. Restore the previous app directory or previous release bundle.
3. Reuse the preserved env file and local data directories.
4. Run `doctor`.
5. Run `--audit-verify`.
6. Start gateway.

Rollback must not silently reset tokens or delete audit evidence.

## 7. Recovery: Audit Chain Broken

If boot fails because the audit chain is broken:

1. Stop gateway.
2. Run:

```bash
node apps/gateway/dist/main.js --audit-verify --json
node apps/gateway/dist/main.js --audit-dump --json
```

3. Quarantine the broken file or truncate to a verified good prefix.
4. Keep the broken file for post-incident analysis.
5. Restart gateway and confirm a new or repaired chain verifies.

Audit is tamper-evident, not magically self-healing. Do not edit the live chain casually.

## 8. When To Stop

Stop and do not continue the update when:

- `doctor` exits with code `2`
- `--audit-verify` reports broken chain
- release verification reports a secret-like file inside the bundle
- Runtime Invariants differ from expected values
- Approval Gate no longer stops final-review operations
- schedule content appears in runtime snapshot

## 9. Uninstall / Purge

Default uninstall preserves local data. Purge deletes it.

Use purge only after deciding that env, audit, session, memory, schedule, and approval grant data may be destroyed.

Platform commands are documented in [install/README.md](../install/README.md).

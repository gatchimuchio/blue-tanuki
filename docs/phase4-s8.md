# Phase 4-S8: Action Output Delivery

Status: implemented.

## Intent

S7 let HDS-BRAIN emit explicit `tool_call` commands. S8 makes those actions
usable by returning user-visible command output through the gateway.

## Implemented

- Added `apps/gateway/src/result_render.ts`.
- `serve` mode now dispatches rendered output for:
  - successful `llm_call`
  - successful `tool_call`
  - successful `noop`
  - failed non-channel commands
- CLI mode logs rendered non-LLM command output as `command.output`.
- `channel_send` commands are not echoed to avoid recursive sends.
- Output is bounded to avoid dumping unbounded tool responses into channels.

## Rendering

- `llm_call`: raw assistant content.
- `tool_call`: `[tool:<name>]` plus stable JSON.
- `noop`: `[noop] <reason>`.
- failure: `[failed:<command-type>] <error>`.

## Verification

- `pnpm build`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 261 tests

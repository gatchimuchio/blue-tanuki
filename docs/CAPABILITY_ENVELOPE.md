# CAPABILITY_ENVELOPE

BLUE-TANUKI の capability envelope は、downstream component が使える能力を manifest で明示し、未宣言の能力を deny する境界である。

## 1. 原則

- Capability declaration via manifest
- Deny by default
- No undeclared capability use
- Fail closed if capability is missing
- Network, filesystem, process, credential, memory, and notification capabilities must be explicit

## 2. Capability Classes

| Class | Examples | Rule |
|---|---|---|
| network | `network:api.telegram.org`, `network:github.com`, `network:googleapis.com` | host / protocol scope を明示する |
| filesystem | `fs:read:workspace`, `fs:write:adapter-data` | root / path prefix を明示する |
| process | `process:shell`, `process:spawn` | Approval Gate と sandbox policy を通す |
| credential | `secret:TELEGRAM_BOT_TOKEN` | env / secret 名を allowlist 化する |
| memory | `memory:read`, `memory:write`, `memory:reference` | authority source として使わない |
| notification | `notify:channel-send`, `notify:approval` | external send は final-review 対象にする |

## 3. Manifest Rule

Adapter / plugin / skill は必要 capability を manifest に宣言する。Runtime は宣言と実際の使用を照合し、宣言外アクセスを拒否する。

## 4. Fail Closed

capability が不足している場合、component は degraded mode ではなく fail closed する。例外を作る場合は preview quarantine に隔離し、main release gate で再審査する。

## 5. Authority Boundary

capability は「実行可能な操作の範囲」を示すだけであり、authority を与えない。HDS-BRAIN、Approval Gate、Runtime Invariants、hash-chain audit の優先順位は変わらない。

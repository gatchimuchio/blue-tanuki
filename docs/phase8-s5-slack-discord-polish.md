# Phase 8-S5 - Slack / Discord Release Polish + Live Smoke

## Objective

Slack / Discord adapters を release-polished preview まで引き上げる。first-party 昇格は、所有者が実 token / test target で credentialed live smoke を完走してから判断する。

## Scope

- adapter-level retry/backoff
- typed `recoverable` / `non_recoverable` delivery errors
- owner-facing `next_action`
- live smoke credential path and skip path
- conformance tests
- compatibility matrix / readiness docs

## Implemented

- `SendResult` に `error_kind`, `error_code`, `retry_after_ms`, `next_action` を追加
- Slack / Discord channel send failureを typed result に分類
- production transports で known retry-after hints を抽出
- `OutboundDispatcher` と executor failure result も typed delivery details を保持
- live smoke の失敗出力に typed delivery detail を表示
- adapter conformance / channel unit tests を追加

## Safety Boundary

Slack / Discord は downstream adapter のまま。channel metadata は `reply_to` などの routing context に限定し、authority metadata を持ち込まない。

## Audit Impact

Typed delivery details are executor feedback only. They are audit evidence, not authority signal.

## Preview Boundary

`docs/compatibility-matrix.json` では `first-party-preview` を維持する。理由は、実 credentials を使う live smoke が owner environment 依存であり、この作業環境では外部送信を実行していないため。

## Validation

Local conformance and skip-path validation are required. Credentialed Slack / Discord live smoke is intentionally owner-gated because it can post real messages.

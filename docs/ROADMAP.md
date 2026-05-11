# BLUE-TANUKI ロードマップ v6

この文書は BLUE-TANUKI の active internal roadmap である。外部向けの比較資料、法務資料、マーケティング資料ではなく、実装判断を安全側に寄せるための内部設計文書として扱う。

旧ロードマップは `docs/history/` に格納する。現リポジトリで確認できない旧版は新規作成しない。

## 0. 設計原理（不変項 / Sacred Constraints）

1. 安全性
2. 堅牢性
3. 快適性 / ユーザビリティ
4. その他機能・チャネル網羅・拡張

この順序は固定であり、機能追加・チャネル網羅・OpenClaw互換性より常に優先される。

Product image:

```md
往年の BlackBerry（堅牢性） + iPhone（UX）
```

Positioning:

```md
個人OSS / no-support / 商用化なし / safety-first resident AI control plane
```

HDS-BRAIN が authority path を所有する。LLM / tools / channels / plugins / memory / cron / UI は downstream devices であり、authority source ではない。

## 1. OpenClaw との関係

BLUE-TANUKI における「OpenClaw 上位互換」とは、OpenClaw の全機能を無条件に first-party core として複製することではない。

定義:

1. 安全性・堅牢性・UX において OpenClaw を構造的に上回る。
2. OpenClaw が持つ主要ユースケースを、安全原則を破らず再現可能にする。
3. long-tail channels は first-party core ではなく、adapter/plugin IF + conformance suite により再現可能性を担保する。
4. 安全性・堅牢性・運用責任に反する実装ルートは、たとえ OpenClaw が実装していても互換対象から除外する。

Core positioning:

```md
OpenClaw は LLM agent に手足を与える設計。
BLUE-TANUKI は HDS authority core の下に LLM / tools / channels / plugins / memory を従属させる設計。
```

互換性は channel 数の競争ではなく、主要ユースケースを安全な境界内で再現できるかで判断する。

## 2. v0.1.0 = Safety Demonstration Release

v0.1.0 は機能網羅版ではない。HDS-BRAIN authority core、Approval Gate、Runtime Invariants、hash-chain audit、downstream adapter 境界が実機で一貫して動くことを示す release である。

Completion criteria:

- WebChat + Telegram work on a real local setup
- final-review always passes through Approval Gate
- HDS-BRAIN does not call LLM
- memory is not used as authority
- external metadata cannot escalate authority
- runtime invariants are visible
- hash-chain audit can be verified by CLI
- README-only setup can reach pnpm install -> start -> WebChat/Telegram smoke test

WhatsApp は v0.1、v1.0、または任意の first-party release の完成条件に含めない。

## 3. Channel Scope

### Tier S（v0.1〜v0.2 first-party target）

1. WebChat
2. Telegram
3. Discord
4. Slack
5. Microsoft Teams
6. LINE

Tier S は「first-party core として責任を持つ可能性がある範囲」を示す。各 channel は adapter contract、capability envelope、conformance test、preview quarantine、main release gate を通過しなければならない。

### Preview / Existing

- Discord と Slack は既存実装を release 品質へ磨く。
- preview から main へ上げる条件は `docs/CONFORMANCE.md` に従う。
- channel metadata は authority escalation に使わない。

### Reserved / Third-party Adapter Only

#### WhatsApp

WhatsApp は需要上は最大級だが、規約・実装ルート・安定性・運用責任が複雑なため、BLUE-TANUKI first-party core では実装しない。

方針:

- Baileys / WAHA / WhatsApp Web automation は core 採用しない
- WhatsApp Business API / Twilio も first-party release 対象に含めない
- v1.0 の完成条件から WhatsApp を除外する
- `compatibility-matrix` 上は `reserved-third-party` として扱う
- 第三者 adapter が plugin IF 経由で実装できる余地は残す
- BLUE-TANUKI 本体は当該 adapter の安全性・規約適合性・運用責任を負わない

重要:
BLUE-TANUKI は WhatsApp 専用の非公式実装を提供しない。提供するのは、一般化された channel adapter interface のみである。

### Long-tail Channels

iMessage、Google Chat、Signal、Matrix、Feishu などの long-tail channels は first-party core ではない。需要観測と adapter IF の成熟度を見て判断する。安全境界を破る実装ルートは採用しない。

## 4. 拡張性の定義

BLUE-TANUKI における拡張性とは、単に plugin を追加できることではない。

本リポジトリを LLM / Codex / 第三者開発者が読んだとき、HDS-BRAIN、authority path、approval gate、runtime invariants、audit hash-chain を侵食せず、定義済み adapter contract / capability envelope / conformance test に従って、下流 channel / module / skill を一定品質で追加できる性質を指す。

したがって拡張性は以下を含む。

- LLM-readable repository structure
- stable adapter contract
- manifest-driven capability declaration
- conformance test
- preview quarantine
- main release gate
- audit trace compatibility
- authority non-escalation invariant

拡張性の目的は「誰でも好きに拡張できること」ではなく、「誰が、またはどのLLMが実装しても、core safety property が壊れないこと」である。

## 5. Phase Plan

### Phase 1: Safety Foundation

- **1-1 HDS authority path invariant**
  - HDS-BRAIN は LLM を呼ばない
  - LLM output は final authority にならない
  - privileged operation は Approval Gate を通る
- **1-2 Runtime Invariants**
  - invariant は外部から inspect 可能にする
  - channel / plugin / memory metadata は authority escalation に使わない
- **1-3 Approval Gate**
  - final-review boundary を固定する
  - cron / webhook / plugin 経由でも bypass しない
- **1-4 hash-chain audit**
  - CLI で検証可能にする
  - format compatibility を壊さない
- **1-5 capability envelope**
  - manifest 宣言を必須にする
  - undeclared capability は deny
- **1-6 preview quarantine**
  - experimental / third-party-like code は main release へ直入れしない
- **1-7 adapter boundary**
  - inbound/outbound canonical type を固定する
  - channel metadata は authority ではない
- **1-8 README-only local setup**
  - `pnpm install` から WebChat/Telegram smoke まで到達可能にする
- **1-9 HDS Memory Contract / F-reference skeleton**
  - memory は authority source ではない
  - memory は context source / preference source / continuity source に限定
  - memory entry は append-only
  - memory reference は `F:<id>` として audit trace に残す
  - memory に基づく action escalation は禁止
  - memory read/write は approval policy と capability envelope の支配下に置く
  - v0.1 では skeleton / contract / tests のみ
  - full long-term memory implementation は Phase 6-3

### Phase 2: Robustness and Resident UX

- Control Center を resident console として整える
- Approval Queue / Notification Center / Authority Trace を live 化する
- audit dump HTTP endpoint と CLI validator を同じ意味論に揃える
- installer / onboarding / doctor を「迷わず起動できる」品質へ寄せる

### Phase 3: Adapter / Plugin Conformance

- `docs/ADAPTER_CONTRACT.md` を実装判断の基準にする
- conformance suite を first-party channel と preview channel に適用する
- capability envelope、audit trace、Runtime Invariants preservation を test-enforced にする
- third-party adapter は signed third-party と preview quarantine を前提にする

### Phase 4: First-party Channel Completion

- WebChat: Control Center host として完成品質
- Telegram: v0.1 first-party smoke target
- Discord / Slack: existing adapter を release candidate へ磨く
- Microsoft Teams / LINE: v0.2 first-party target として仕様を固める
- WhatsApp: reserved-third-party のまま core 実装しない

### Phase 5: Tools and Infrastructure

- cron / webhook / browser / web_search / file write/edit / shell / GitHub tool を downstream tool として扱う
- privileged tool は Approval Gate を bypass しない
- network / fs / process / credential capability は明示宣言する
- tool output は authority source ではない

### Phase 6: Memory and Continuity

- **6-1 Memory storage hardening**
  - append-only storage と retention policy を分離する
- **6-2 F-reference audit integration**
  - read/write/reference を audit trace に残す
- **6-3 Full HDS long-term memory implementation**
  - Phase 1 の Memory Contract を破らない範囲で実装する
  - memory による permission escalation は引き続き禁止

## 6. Release Gates

main release に入れる条件:

- Sacred Constraints を弱めない
- authority path を変更する場合は明示レビューと tests を追加する
- Approval Gate bypass がない
- Runtime Invariants が inspect 可能
- hash-chain audit 互換性が維持される
- capability envelope enforcement が fail closed
- conformance tests が pass
- preview quarantine から昇格する理由が docs に残る

## 7. Reference Docs

- [Adapter Contract](ADAPTER_CONTRACT.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)
- [Conformance](CONFORMANCE.md)
- [LLM Development Guide](LLM_DEVELOPMENT_GUIDE.md)
- [Security Review Checklist](SECURITY_REVIEW_CHECKLIST.md)
- [Non-Goals](NON_GOALS.md)
- [Compatibility Matrix](compatibility-matrix.json)

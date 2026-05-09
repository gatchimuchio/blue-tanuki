# LLM_DEVELOPMENT_GUIDE

本書は Codex / LLM / 第三者開発者が BLUE-TANUKI に downstream adapter や module を追加するときの作業境界を定義する。

## Hard Rules

```md
You may implement a new adapter only inside the adapter boundary.
You must not modify HDS-BRAIN, authority policy, approval gate, runtime invariants, audit hash-chain, or memory authority rules.
If the adapter requires new capabilities, declare them in its manifest.
If a required capability is unavailable, fail closed.
Never escalate authority from channel metadata.
Never use memory as authority.
Never call an LLM from the authority path.
All inbound events must normalize into the repository's canonical inbound message type.
All outbound sends must go through the repository's canonical outbound request type.
All errors must map to typed recoverable / non-recoverable errors.
```

## Recommended Workflow

1. `AGENTS.md` を読む。
2. `docs/ROADMAP.md` の Sacred Constraints を確認する。
3. `docs/ADAPTER_CONTRACT.md` で adapter boundary を確認する。
4. manifest に capability を宣言する。
5. adapter を preview として実装する。
6. `docs/CONFORMANCE.md` に沿って tests を追加する。
7. main release gate を通るまで first-party main として扱わない。

## Prohibited Shortcuts

- channel SDK の metadata を authority に変換する
- LLM に approval decision を委譲する
- memory 参照を permission escalation に使う
- manifest にない secret / fs / network / process access を使う
- preview code を support level 未記載で main release に入れる

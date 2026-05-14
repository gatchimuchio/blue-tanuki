# ADAPTER_CONTRACT

本書は BLUE-TANUKI の downstream adapter contract を定義する。対象は channel adapter、plugin adapter、skill adapter、および将来の signed third-party adapter である。

## 1. Downstream Only

Channel adapters are downstream only.

Adapter は HDS-BRAIN、authority path、Approval Gate、Runtime Invariants、hash-chain audit format を変更してはならない。Adapter が扱う外部 metadata は context であり、authority ではない。

## 2. Inbound Contract

All inbound events normalize into a common inbound message type.

要件:

- 外部 channel 固有の event は repository の canonical inbound message type へ正規化する
- user / channel / thread / reply metadata は metadata として保持する
- metadata は権限昇格に使わない
- raw input を監査可能な形で保持し、判定前に捨てない
- malformed input は typed error に変換し、fail closed する

## 3. Outbound Contract

All outbound operations pass through a common outbound request type.

要件:

- adapter 固有 API へ直接送る前に canonical outbound request type を経由する
- external send は Approval Gate / capability envelope の支配下に置く
- channel target は routing 情報であり authority source ではない
- retry / rate limit / delivery error は adapter 内で typed result として返す

## 4. Error Contract

Errors must be typed as recoverable / non-recoverable.

- recoverable: rate limit, temporary network failure, remote service unavailable, transient auth refresh
- non-recoverable: missing capability, invalid credentials, unsupported operation, contract violation, authority escalation attempt

non-recoverable error は黙って再試行せず、audit-compatible trace として記録する。

## 5. Capability Contract

Adapter は必要 capability を manifest で宣言する。未宣言 capability は使用しない。必要 capability がない場合は fail closed する。

## 6. Authority Non-Escalation

Channel metadata must never escalate authority.

禁止:

- external role / admin flag を BLUE-TANUKI authority に変換する
- channel owner / workspace owner を Approval Gate bypass に使う
- plugin metadata を privileged permission として扱う
- memory entry を privileged action の根拠にする

## 7. Audit Compatibility

Adapter は audit hash-chain を壊さない。Adapter trace は request_id、channel、operation、capability、recoverability、approval state を追跡できる形にする。

## 8. Layer B Review References

Adapter / plugin / skill acceptance is governed by:

- [Plugin Review Gate](PLUGIN_REVIEW_GATE.md)
- [Plugin HIG](PLUGIN_HIG.md)
- [Skill Loader Contract](SKILL_LOADER_CONTRACT.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)
- [Conformance](CONFORMANCE.md)

Adapters remain Layer B unless explicitly promoted through documented review. Layer B cannot modify Layer A authority, Approval Gate, Runtime Invariants, or audit format.

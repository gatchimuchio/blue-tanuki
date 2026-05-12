# Known Environment Failures

この文書は、Codex 作業時に既知の環境失敗を製品リグレッションとして扱わないための分類表です。内部思想、HDS 核、封印領域、未公開の設計根拠はここに展開しません。

## `pnpm` が PATH にない

### 症状

`pnpm install` または `pnpm` を使う検証コマンドが、`pnpm` を見つけられず失敗する。

### 分類

環境セットアップ不備です。アプリケーションコードの不具合として扱いません。

### 復旧手順

```bash
node --version
corepack --version || true
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
pnpm install --frozen-lockfile
```

この手順後も `pnpm` が使えない場合、検証は環境制約により限定されたものとして報告します。missing `pnpm` を直すために製品コードを書き換えてはいけません。

## `smoke:serve` / `smoke:resume` の root workspace resolution 失敗

### 対象コマンド

```bash
pnpm smoke:serve
pnpm smoke:resume
smoke_serve
smoke_resume
```

### 症状

リポジトリ root から実行したとき、既存の root workspace resolution 問題により失敗する。

### 分類

既知の検証基盤不備です。通常のコード変更に対する製品リグレッション判定には使いません。

### 運用方針

- 通常検証では実行しません。
- root workspace resolution 修正を明示されたタスクでのみ調査します。
- 通常検証では `pnpm typecheck`、`pnpm test`、対象パッケージ単位のテストを優先します。
- この失敗を理由に、無関係なアプリケーションコード、公開 API、設定仕様を書き換えてはいけません。

## 報告形式

既知環境失敗に遭遇した場合は、次を明示します。

- command
- result
- classification
- likely cause
- whether it appears pre-existing or introduced by the current change
- files modified
- recommended next action

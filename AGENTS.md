# AGENTS.md

このファイルは、このリポジトリで作業するAIコーディングエージェント（Claude Code含む）に向けたガイダンスです。

## 開発体制

本プロジェクトはClaude CodeとCodex CLIを併用する体制で開発する。役割分担は以下の通り。

- **Claude Code — 開発リーダー**
  - 外部設計、テスト、コードレビューを担当する。
  - プロダクトの確実な実装完了に責任を持つ。
  - 必要に応じてClaude Code自身のsub agent（Explore等）を活用し、効率的な開発推進をリードする。
  - **Codexへの指示は自律的に送信しない。** Claude CodeがCodex CLI（`codex-companion.mjs`・`codex:rescue`等）を直接呼び出して指示を送ることは行わない。Codexに実行させたい内容がある場合は、指示プロンプト（テキスト）を作成して人間に提示するところまでを担当する。実際にそのプロンプトをCodex側へ入力し実行するのは人間が行う。
  - Codexからの応答（疑問点への回答待ちなど）も、人間が転記してきた内容に対して返答を作成する。他agentからの質問に対応する際、人間への確認が必要な判断は、agentが代わりに判断せず必ず人間に質問する。
- **Codex — developer**
  - 人間が手入力で渡した指示（Claude Codeが作成したプロンプト、または人間自身の指示）に従いタスクを遂行する。
  - 不明点はリーダー（Claude Code）に確認する。ただしこれも人間を介した手動のやり取りとなる。

## プロジェクトの状態

アプリケーションコードはまだ存在しません。現時点でこのリポジトリに含まれるのは以下のみです。

- `idea.md` — プロダクト仕様書の元ネタ（口頭説明を文字起こししたもの。日本語、フィラー含む）
- `SPEC.md` — `idea.md` を整理した要件定義
- `PLAN.md` — `SPEC.md` を実装するための計画（技術方針・フェーズ分け・確定仕様/仮定の一覧）
- `design-system-example-components-html/` — 参照用にベンダリングされたリポジトリ（独自の `.git` を持つ）。アプリ本体の一部ではない

ルートディレクトリ自体はgitリポジトリではありません。実際のアプリの雛形ができたら、実際のビルド/lint/テストコマンドとアーキテクチャの説明でこのファイルを更新してください。

## プロダクト概要

住宅ローンの契約前に、様々な借り入れ条件を素早く比較検討するための返済シミュレーターです。詳細な要件は `SPEC.md`、実装計画は `PLAN.md` を参照してください（このファイルでは要件を重複して記載しない）。

## DADS参照リポジトリ（`design-system-example-components-html/`）

これは `digital-go-jp/design-system-example-components-html` をベンダリングしたものです。DADSコンポーネントをフレームワーク非依存のHTML/CSS/JSで実装した参照実装であり、DADS準拠のUIを作る際の参考として置かれています。このディレクトリ内のファイルを実際に触る際は、独自の `AGENTS.md` を読んでください。これは独自の履歴を持つ別のgitチェックアウトであり、パターンを参考にするための参照ライブラリとして扱い、気軽に変更しないこと。

主なポイント（詳細はその `AGENTS.md` を参照）:

- **構成**: `src/components/<name>/` に各コンポーネントの `.css`, `.html`, `.js`, `.stories.ts`, `.vrt.js`/`.test.js`/`.unit.js`, `.mdx` が格納される。`src/helpers/` にTSユーティリティ、`src/global.css` にデザイントークン。
- **コマンド**（`design-system-example-components-html/` 内で実行）:
  ```bash
  npm run storybook              # 開発用サーバー起動（localhost:6006）
  npm test                       # Vitest + Playwright VRT を全実行
  npm run format                 # Biome format --write
  npx playwright test src/components/button/button.vrt.js   # 単一VRTテスト
  npx playwright test -g "Normalize.css"                     # 名前指定で単一VRTテスト
  ```
- **規約**: `dads-` プレフィックス付きBEM CSS、data属性によるモディファイア（例: `[data-type="solid-fill"]`）／Shadow DOMなしのCustom Elements（`disconnectedCallback` でリスナー解除）／`rem` は `calc(px / 16 * 1rem)` パターンで指定、`px` はボーダーのみ／WCAG 2.2 AA準拠を目標に、forced-colors・reduced-motionに対応。
- テストはビジュアルリグレッションテスト（VRT）で、複数のCSSリセットライブラリ（Normalize.css, Bootstrap Reboot, Tailwind Preflight, Eric Meyer's Reset, kiso.css）間でコンポーネントが同一に表示されることを検証する。

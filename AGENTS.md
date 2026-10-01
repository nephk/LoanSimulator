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

アプリケーションコードは実装済み。リポジトリに含まれる主なファイル：

- `idea.md` — プロダクト仕様書の元ネタ（口頭説明の文字起こし）
- `SPEC.md` — `idea.md` を整理した要件定義
- `PLAN.md` — 実装計画（技術方針・フェーズ分け）
- `IMPLEMENT.md` — ユーザーテスト結果をもとにした修正・追加要望のメモ
- `index.html` — ViteのエントリHTML
- `src/main.tsx`, `src/App.tsx` — Reactエントリとアプリシェル
- `src/components/dads/` — DADS Reactコンポーネントのコピー
- `src/features/loan-form/` — フォーム、結果表示、チャートのReactコンポーネント
- `src/amortization.js` — 返済計算ロジック（純粋関数）
- `src/amortization.test.js` — `node --test` によるユニットテスト
- `src/charts.ts` — Chart.js呼び出しラッパー
- `src/index.css` — Tailwind CSSエントリ
- `design-system-example-components-react/` — DADS Reactコンポーネントの参照用リポジトリ

## 開発コマンド

### 開発サーバー・ビルド

```bash
npm install
npm run dev
```

起動後、ブラウザで **http://localhost:8080** を開く。

本番ビルドとプレビュー:

```bash
npm run build
npm run preview
```

> **キャッシュに注意**: JS・CSSの変更がブラウザに反映されない場合はハードリロードを行う。
> - Mac: **⌘ + Shift + R**
> - Windows/Linux: **Ctrl + Shift + R**
> - または DevTools（F12）を開いた状態でリロードボタンを長押し →「キャッシュの消去とハード再読み込み」

### 計算ロジックのユニットテスト

```bash
node --test src/amortization.test.js
```

## プロダクト概要

住宅ローンの契約前に、様々な借り入れ条件を素早く比較検討するための返済シミュレーターです。詳細な要件は `SPEC.md`、実装計画は `PLAN.md` を参照してください（このファイルでは要件を重複して記載しない）。

## DADS参照リポジトリ（`design-system-example-components-react/`）

これは `digital-go-jp/design-system-example-components` のReact版参照実装です。DADS Reactコンポーネントをコピーする際の参照ライブラリとして扱い、変更しないでください。このディレクトリ内のファイルを実際に触る際は、独自の `AGENTS.md` を読んでください。

主なポイント（詳細はその `AGENTS.md` を参照）:

- **構成**: `src/components/<name>/` にReactコンポーネントの`.tsx`/`.ts`とTailwindクラスが格納される。
- **規約**: コピーしたReactコンポーネントのTailwindクラスを変更せず、必要な依存コンポーネントも併せてコピーする。アプリ側もTypeScriptとTailwindを使用し、WCAG 2.2 AA準拠を目標にする。

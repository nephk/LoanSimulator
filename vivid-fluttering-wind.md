# 住宅ローンシミュレーター UIのReact化

## Context

現在のUIは素のHTML/CSS/JS（`index.html` + `src/app.js` + `src/style.css`、DOM直接操作）で実装されている。これをReactベースのUIに置き換える。ビジネスロジック（`src/amortization.js`の返済計算、`src/charts.js`のChart.jsラッパー）はフレームワーク非依存の純粋関数なので変更せず流用する。見た目は`design-system-example-components-react`（DADSのReact版リファレンス、Tailwind CSS + `@digital-go-jp/tailwind-theme-plugin`でスタイリング）のコンポーネントをコピー・改変して使う。対象はPC/スマホのブラウザのみ（ネイティブアプリ化はしない）。

ユーザー確認済みの方針：
- **スタイリングはTailwind導入**（既存の手書きDADS CSS変数は廃止し、リファレンスのコンポーネントをほぼそのままコピーする）
- **新規コードはTypeScript**（コピー元が`.tsx`なので型ごと流用できる）

## 新規依存関係

`package.json`に追加（バージョンは`design-system-example-components-react/package.json`の採用バージョンに揃える）:
- `react@^18.3.1`, `react-dom@^18.3.1`
- `vite@^8.1.4`, `@vitejs/plugin-react-swc@^4.3.1`（Rustベース; 参照元と同じプラグインを使う）, `typescript@^6.0.3`, `@types/react@^18.3.31`, `@types/react-dom@^18.3.7`
- `tailwindcss@^3.4.19`, `postcss@^8.5.19`, `autoprefixer@^10.5.2`, `@digital-go-jp/tailwind-theme-plugin@^1.0.1`, `@tailwindcss/container-queries@^0.1.1`
- `chart.js`（CDN `<script>`読み込みをやめ、npm importに切り替える。Viteバンドルには必須）

既存の`devDependencies.playwright`（`tests/user-test-runner.js`用）はそのまま残す。

## ファイル構成の変更

### 削除（置き換えのため）
- `src/app.js` — React側の状態管理に置き換え
- `src/style.css` — Tailwind + DADSトークンプラグインに置き換え（DADSトークン部分は丸ごと不要になる）
- `design-system-example-components-html/` — React化完了後は参照先が`design-system-example-components-react/`に一本化されるため削除する。**現状このディレクトリはコードとして`import`/`<link>`等で参照されておらず、`src/style.css`に手書きでインライン化されている**（`index.html`での直接参照もない）。React化の作業中は削除せず、完了確認後に削除する

### そのまま流用（変更なし）
- `src/amortization.js` と `src/amortization.test.js` — 純粋な計算ロジック。`node --test src/amortization.test.js`はそのまま通る想定
- `design-system-example-components-react/` — コピー元として参照するが中身は改変しない

### 新規・変更
- `vite.config.ts` — `@vitejs/plugin-react`、開発サーバーは`server: { port: 8080 }`で現状の`python3 -m http.server 8080`と同じポートに揃え、`tests/user-test-runner.js`の`BASE_URL`を変えずに済ませる
- `tsconfig.json` — `jsx: react-jsx`, `moduleResolution: Bundler`, `target: "ES2022"`, `lib: ["DOM", "DOM.Iterable", "ESNext"]`など。**注意**: 参照元の`tsconfig.json`は`extends: "@tsconfig/node22/tsconfig.json"`を使っているが、アプリはブラウザ向けなのでこのextendsは使わず直書きする。`strict: true`を入れておくと後悔が少ない
- `tailwind.config.js` / `postcss.config.js` — `content: ['./index.html', './src/**/*.{ts,tsx}']`、プラグインに`@digital-go-jp/tailwind-theme-plugin`と`@tailwindcss/container-queries`を登録
- `index.html` — Viteエントリに変更。`<div id="root"></div>` + `<script type="module" src="/src/main.tsx">`のみ。Chart.jsのCDN `<script>`と旧stylesheetの`<link>`は削除
- `src/main.tsx` — `createRoot(...).render(<App />)`
- `src/index.css` — `@tailwind base; @tailwind components; @tailwind utilities;` のみ（トークンはプラグインが提供するため独自CSS変数は不要）
- `src/charts.ts` — `src/charts.js`を移植。グローバル`Chart`参照を`import Chart from 'chart.js/auto'`に差し替えるだけで、ロジック（`renderBalanceChart`/`renderYearlyChart`、`Chart.getChart(canvas).destroy()`での再描画）は変更しない

### コピーするDADSコンポーネント（`src/components/dads/`）
`design-system-example-components-react/src/components/`から、使う分だけ`.tsx`/`.ts`（`.stories.tsx`・`.test.tsx`・`.mdx`・`component-spec.md`は除く）をコピーして配置。Tailwindのクラス文字列はそのまま流用（手で既存CSSクラスに置き換えない）:
- `Button`（`Slot`も依存先として必要なのでコピー）
- `Input`
- `Radio`
- `Checkbox`
- `Label`, `Legend`, `SupportText`, `ErrorText`
- `NotificationBanner`（フォームエラー表示`#form-error`に使う。`parts`/`styles.ts`/`types.ts`含む）

`Card`・`Table`はリファレンス側にコンポーネント実体が無く、マークアップパターンのみ（Markdown参照）なので今回は使わない（現状UIもカード/テーブルを使っていない）。

### アプリ固有コンポーネント（`src/features/loan-form/`）
`src/app.js`の各関数をReactコンポーネント/フックに1:1で移植する:

| 現状 (`src/app.js`) | 移植先 |
|---|---|
| フォーム全体の状態・`calculate()` | `LoanForm.tsx`（`useState`でフォーム状態を持ち、変更ごとに`simulate()`を呼ぶ） |
| ローン形式ラジオ・連帯債務者セクション表示切替 | `LoanTypeField.tsx`（`loanType==='pair'`で`BorrowerSection`を条件表示） |
| 借入期間入力 | `TermYearsField.tsx` |
| `rate-segments`の追加/削除、`getRemainingYears`/`syncLastSegmentYears`/`updateAddButton`相当のロジック | `RateSegmentEditor.tsx`（配列state + 上記ロジックをローカル純関数として移植） |
| 借入金額欄のカンマ整形（`formatPrincipalInput`/`readNumber`、focus時に数字のみ・blur時にカンマ整形） | `usePrincipalInput.ts`フック（本人/連帯債務者で2回再利用） |
| 本人/連帯債務者セクション（借入金額＋返済方式） | `BorrowerSection.tsx`（`primary`/`secondary`で再利用） |
| ボーナス返済チェックボックス＋条件表示フィールド | `BonusFields.tsx` |
| 計算結果の文言（`formatMonthPeriod`含む） | `ResultSummary.tsx` |
| 2つの`<canvas>`描画 | `BalanceChart.tsx`/`YearlyChart.tsx`（`useRef`+`useEffect`で`charts.ts`の関数を呼ぶ薄いラッパー） |
| 初期化ボタン | `LoanForm.tsx`内で`DEFAULTS`に戻すだけ（DOM再構築ではなくstateリセット） |

`App.tsx`はヘッダー（タイトル・リード文）+ `<LoanForm />`。

### DOM互換性（E2Eテスト保護のため）
`tests/user-test-runner.js`がid/data属性で要素を直接触っているため、以下は**現状と同じ値**を保つ:
- id: `term-years`, `primary-principal`, `secondary-principal`, `bonus-enabled`, `bonus-amount`, `bonus-month-1`, `bonus-month-2`, `reset-button`, `form-error`, `summary-total-payment`, `summary-first-month-payment`, `summary-first-month-period`, `summary-max-payment`, `summary-max-period`, `summary-min-payment`, `summary-min-period`, `balance-chart`, `yearly-chart`
- data属性: `data-borrower="primary"/"secondary"`, `data-rate-segment`, `data-rate-field="years"/"annualRatePercent"`, `data-action="add-segment"/"remove-segment"`

非表示切替は現状`hidden`属性だが、Reactでは条件レンダリング（アンマウント）にする。`page.locator(...).isVisible()`ベースのチェックは意味的に等価なので問題ないはずだが、`errorEl?.hidden`を直接読む箇所は未出現時に`null`になり`?? false`相当で評価されるため動作は変わらない想定。実装後に実テストで確認する。

**内部実装ノート（E2Eには現れないが実装で重要）**: `data-rate-segments-shared`属性は`user-test-runner.js`が直接参照しないが、現行`app.js`でcontainerを識別するキーになっている。Reactでは`RateSegmentEditor.tsx`がrate segmentの配列stateを`useState`で管理するため、このDOM属性はもはや不要になる（JSXで`<div ref={containerRef}`として`useRef`で引き当てる）。削除して問題ない。

### AGENTS.md更新
- 開発コマンド節: `python3 -m http.server 8080`を`npm install`→`npm run dev`に、ビルド確認用に`npm run build && npm run preview`を追記。「ビルドステップは不要」の記述を削除
- ファイル一覧節: 新しい`src/`構成（`components/dads/`、`features/loan-form/`、`main.tsx`、`charts.ts`等）に更新。`src/style.css`の記載を削除（Tailwindに移行した旨を明記）
- DADS参照リポジトリ節: `design-system-example-components-react/`を`design-system-example-components-html/`と並ぶ参照リポジトリとして追記（独自の`AGENTS.md`がある旨も）
- `THIRD_PARTY_NOTICES.md`: React版コンポーネントのコピー元（`digital-go-jp/design-system-example-components-react`, MIT）を帰属表示に追加

## 検証手順

1. `npm install`
2. `node --test src/amortization.test.js` — ロジック無改変なので既存どおり通ることを確認
3. `npm run dev` → `http://localhost:8080`をブラウザ（Playwright MCP）で開き、手動で一通り操作:
   - 単身/ペアローン切替で連帯債務者セクションの表示切替
   - 金利区間の追加・削除（残り年数0での追加ボタンdisabled確認）
   - 借入金額欄のblur時カンマ整形・focus時の生数字表示
   - ボーナス返済チェックで3項目の表示切替
   - 初期化ボタンでデフォルト値に戻る
   - 2つのグラフ（残高推移・年間返済額）が描画される
   - ブラウザ幅をスマホサイズ（375px程度）にリサイズし、横スクロールやレイアウト崩れが無いことを確認
4. `node tests/user-test-runner.js`相当のE2Eテストを実行し、id/data属性のズレで落ちるアサーションがあれば修正（新規に壊れたものだけ対応、元から噛み合っていない箇所は現状通り）
5. `npm run build && npm run preview` で本番ビルドが問題なく動作することを確認

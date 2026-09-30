# IMPLEMENT.md

`tests/reports/summary-report.md`（ユーザーテスト結果）で発見された問題の修正メモ。

## ✅ 1. 借入期間変更時に金利区間の年数が自動追随しない（🔴 HIGH）

- 現状: `termYears`（借入期間）と各金利区間の`years`合計は独立していて、借入期間だけ変更すると合計が不一致になり、`amortization.js`の`validateRateSegments`が例外を投げる。その結果、生の英語エラー `borrowers[0].rateSegments years must add up to termYears` が `#form-error` にそのまま表示される。
- 対応方針:
  - `app.js`: `termYears`変更時に、最後の金利区間の`years`を自動調整（差分を最後の区間に加減）し、合計を常に`termYears`と一致させる。
  - `amortization.js`: バリデーションエラーのメッセージを日本語化し、ユーザー向けの文言に変える（内部の変数名・プロパティパスをそのまま出さない）。

## ✅ 2. 専門用語（元利均等・元金均等・ペアローン）の説明がない（🔴 HIGH）

- 現状: ラジオボタンのラベルのみで、意味の説明が一切ない。
- 対応方針:
  - `index.html`: 各ラジオグループのラベル横に一言説明を追加する（ツールチップ、または常時表示の補足テキスト）。
    - 元利均等: 「毎月の返済額が一定」
    - 元金均等: 「毎月の元金部分が一定（返済額は徐々に減る）」
    - ペアローン: 「夫婦などが別々に借り入れ、それぞれ返済する方式」

## ✅ 3. 「金利区間を追加」ボタンが直前の区間を無断で2分割する（🟡 MEDIUM）

- 現状: `app.js`の`addSegment()`が、直前の区間の`years`を勝手に前半/後半に分割し、両方に同じ利率をコピーする。ユーザーが直前に入力した年数が無断で書き換わる。
- 対応方針: `addSegment()`を「直前の区間はそのまま残し、残り年数（`termYears` − 既存区間の年数合計）を新規区間として追加する」動作に変更する。残り年数が0以下の場合はボタンを無効化するか追加不可にする。

## ✅ 4. 借入金額入力欄にフォーカスアウト時のカンマ区切り表示を追加（追加要望）

- 現状: `primary-principal` / `secondary-principal` は `type="number"` のため、カンマ区切り表示ができない（number入力はカンマを含む値を受け付けない）。
- 対応方針:
  - 入力欄を `type="text"` + `inputmode="numeric"` に変更し、計算時は入力値からカンマを除去して数値化する。
  - `blur`時: `Number(value.replace(/,/g, '')).toLocaleString('ja-JP')` で整形して表示。
  - `focus`時: カンマを除去した生の数値に戻す（編集しやすくするため）。
  - 対象: 借入金額（本人・連帯債務者）。他の数値入力（借入期間・年利・ボーナス額等）は今回は対象外。

## 5. PC表示で左右の余白が広すぎ、フォームが窮屈に折り畳まれる（🟡 MEDIUM）

- 現状: `src/style.css` の `.loan-app` が `width: min(100% - 32px, 960px)` に固定されているため、PCの広いウインドウでは左右の空白ばかりが広がり、逆に960px幅の中では3列グリッド（`.loan-form__top`）・金利区間の3カラムグリッド（`.rate-segment`）・ラジオボタンの補足文（`.loan-choice__hint`）などが窮屈に折り返して見づらい。
- 対応方針:
  - `.loan-app` の最大幅を広げる（例: 960px → 1200〜1440px程度）。ウインドウ幅を使い切らないよう、`min(100% - Npx, Mpx)` のパターンは維持し最大値のみ調整する。左右マージンは適切に確保する。
  - 広がった横幅を活かすグリッド調整（例: ペアローン時に本人/連帯債務者セクションを2カラム表示にする等）は必須ではない。まずは最大幅拡大による折り畳み解消を優先する。
  - モバイル（`@media (max-width: 640px)`）のスタイルは変更しない。

## 6. 借入残高グラフに月々の返済額を重ね描画（追加要望）

- 現状: `src/charts.js` の `renderBalanceChart` は「借入残高」の折れ線グラフのみを描画している。`amortization.js` の `simulate()` が返す `monthly` レコードには各月の `payment`（返済額＝元金＋利息）が既に含まれているため、計算ロジックの追加変更は不要。
- 対応方針:
  - `renderBalanceChart` に「月々の返済額」のデータセットを追加し、`monthly.map(r => r.payment)` を同じグラフに重ねてプロットする。
  - 借入残高と返済額はスケールが大きく異なるため、返済額はChart.jsのセカンダリY軸（`yAxisID: 'y1'`、`position: 'right'`）を使う。軸タイトルは「月々の返済額（円）」とし、目盛りも既存軸と同様に `toLocaleString('ja-JP')` でフォーマットする。
  - 右軸のグリッド線が左軸と重なって見づらくならないよう、`y1` 側は `grid: { drawOnChartArea: false }` を設定する。

## 7. 金利区間を「基本条件」セクションに移動し、ペアローンでも共通入力とする（仕様変更）

- 背景: ペアローンは2人が同一の金融機関・同一商品で借り入れる想定が現実的であり、適用金利は共通。現状は本人・連帯債務者それぞれのセクション内に金利区間の入力が存在し、重複した入力を求めている。
- 変更後仕様: 金利（期間分割含む）はペア間で共通とする（SPEC.md §3 更新済み）。

### 変更対象ファイルと方針

#### `index.html`
- 本人セクション（`[data-borrower="primary"]`）および連帯債務者セクション（`[data-borrower="secondary"]`）内の `.rate-segment-editor` ブロック（`<h3>金利区間</h3>` から `「金利区間を追加」ボタン`まで）を両方とも削除する。
- 「基本条件」セクション（`aria-labelledby="loan-overview-title"`）内、「借入期間」入力欄の直下に、共通の金利区間エディタを新設する。構造は既存の `.rate-segment-editor` と同一だが、`data-borrower` 属性は持たせず、`data-rate-segments-shared` などの識別属性を付与する（後述の `app.js` 実装に合わせて命名する）。

#### `app.js`
- `borrowerSection(key)` 内から金利区間を読み取る `readBorrower()` の `rateSegments` 読み取り処理を、共通エリアから読み取るよう変更する。
  - 具体的には、共通の金利区間コンテナを指す定数（例: `const sharedRateSegmentsContainer`）をトップレベルで定義し、`readBorrower()` 内の `section.querySelectorAll('[data-rate-segment]')` を `sharedRateSegmentsContainer.querySelectorAll('[data-rate-segment]')` に差し替える。
- `addSegment()` / `removeSegment()` が `button.closest('.borrower-section')` でセクションを特定している部分を、共通コンテナに直接アクセスするよう修正する。
- `renderInitialSegments(key)` は `key` 引数を取る必要がなくなるため、`renderInitialSegments()` に一本化し、共通コンテナに対して初期セグメントを1つ描画するよう変更する。初期化時の呼び出しも1回に減らす。
- `syncLastSegmentYears()` および `updateAddButton()` が `section` 引数で借主セクションを受け取っている部分は、共通コンテナを渡すよう変更する（または引数なしで共通コンテナを直接参照する）。
- `termYears` 変更時の `['primary', 'secondary'].forEach(...)` ループは不要になるため削除し、共通コンテナに対して1回だけ `syncLastSegmentYears` / `updateAddButton` を呼ぶよう変更する。
- `resetForm()` 内の `renderInitialSegments('primary')` / `renderInitialSegments('secondary')` を `renderInitialSegments()` 1回に変更する。

#### `amortization.js`
- `BorrowerInput` の型定義から `rateSegments` を除外する。
- `SimulationInput` に `rateSegments: RateSegment[]` を追加する（トップレベルの共通フィールドとして）。
- `validateInput()` 内で `borrower.rateSegments` ごとに呼んでいた `validateRateSegments()` の呼び出しを、`input.rateSegments` に対する1回の呼び出しに変更する。
- `simulateBorrower()` のシグネチャに `rateSegments` を追加し、`borrower.rateSegments` の代わりに受け取った引数を使うよう変更する。呼び出し元（`simulate()` 内の `input.borrowers.map(...))`）から `input.rateSegments` を渡す。
- `buildSimulationInput()`（`app.js`）は `rateSegments` を `borrowers` の外・トップレベルに移動して渡すよう変更する。

#### `amortization.test.js`
- `fixedRate()` ヘルパーから `rateSegments` フィールドを削除し、`simulate()` 呼び出し時のトップレベルに `rateSegments` を渡すよう全テストを修正する。
- 「ペアローン・期間分割金利」テストは、2人が**異なる**金利区間を持つケースから、**共通の**金利区間を持つケースに変更する（2人分の独立計算の検証は、金利を共通にしつつ borrower ごとの借入金額・返済方式の差異で引き続き検証できる）。

## 8. 計算結果に月々返済額の最大値・最小値を追加表示（追加要望）

- 現状: 計算結果エリアに「月々返済額（初回）」のみ表示されている。元金均等返済や金利区間分割、ボーナス返済があると月ごとに返済額が変動するため、初回だけでは全体感が掴みにくい。
- 対応方針:
  - `index.html`: `#summary-first-month-payment` の `<p>` 要素の直下に、最大値・最小値表示用の `<p>` を2行追加する。
    ```html
    <p>月々返済額（最大）: <span id="summary-max-payment">―</span>円</p>
    <p>月々返済額（最小）: <span id="summary-min-payment">―</span>円</p>
    ```
  - `app.js`: `calculate()` 内の結果反映処理に、以下を追加する。`simulate()` が返す `result.monthly` は既に各月の `payment` を持つため、`amortization.js` への変更は不要。
    ```js
    const payments = result.monthly.map((r) => r.payment);
    document.querySelector('#summary-max-payment').textContent = Math.max(...payments).toLocaleString('ja-JP');
    document.querySelector('#summary-min-payment').textContent = Math.min(...payments).toLocaleString('ja-JP');
    ```
  - `app.js`: エラー時（`catch` ブロック）にも `#summary-max-payment` と `#summary-min-payment` を `'―'` にリセットする。
  - `app.js`: トップレベルの DOM 参照定数に `summaryMaxPayment` / `summaryMinPayment` を追加する（既存の `summaryTotalPayment` 等と同じパターン）。

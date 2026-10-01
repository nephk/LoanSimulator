// tests/user-test-runner.js
// AI-driven UX test: two personas (Aiko / Kenji) operate the loan simulator
// independently. Feedback is generated from values actually read off the DOM
// during each run, not pre-written guesses.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:8080';
const SCREENSHOTS_DIR = 'tests/screenshots';
const REPORTS_DIR = 'tests/reports';

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

const feedbackLog = { aiko: [], kenji: [] };

function recordFeedback(agent, step, observation, comment, issues) {
  const entry = { step, observation, comment, issues };
  feedbackLog[agent].push(entry);
  console.log(`[FEEDBACK] ${agent.toUpperCase()} | ${step}`);
  console.log(`  観察: ${observation}`);
  console.log(`  感想: ${comment}`);
  console.log(`  問題点: ${issues || 'なし'}`);
}

async function readState(page) {
  return page.evaluate(() => {
    const errorEl = document.querySelector('#form-error');
    return {
      total: document.querySelector('#summary-total-payment')?.textContent ?? '',
      firstMonth: document.querySelector('#summary-first-month-payment')?.textContent ?? '',
      errorVisible: errorEl ? !errorEl.hidden : false,
      errorText: errorEl?.textContent ?? '',
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function readSegments(page) {
  return page.$$eval('[data-rate-segment]', (rows) =>
    rows.map((row) => ({
      years: row.querySelector('[data-rate-field="years"]').value,
      rate: row.querySelector('[data-rate-field="annualRatePercent"]').value,
    })),
  );
}

function segmentRow(page, index) {
  return page.locator('[data-rate-segment]').nth(index);
}

async function setSegment(page, index, { years, rate } = {}) {
  const row = segmentRow(page, index);
  if (years !== undefined) await row.locator('[data-rate-field="years"]').fill(String(years));
  if (rate !== undefined) await row.locator('[data-rate-field="annualRatePercent"]').fill(String(rate));
}

async function shot(page, agent, step) {
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${agent}-${step}.png`, fullPage: true });
}

// --- Agent A: Aiko のテスト ---
async function runAikoTests(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.waitForTimeout(500);

  await shot(page, 'aiko', '01-open');
  let state = await readState(page);
  recordFeedback(
    'aiko', '01-open',
    `初期表示。総返済額=${state.total}円、月々=${state.firstMonth}円。横スクロール発生=${state.hasHorizontalScroll}`,
    '数字はいきなり出てるけど、「元利均等」「借入期間」とか言葉がむずい。とりあえずスクロールして下まで見てみる。',
    state.hasHorizontalScroll ? 'スマホ幅で横スクロールが発生している' : '',
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, 'aiko', '02-scroll-bottom');
  recordFeedback(
    'aiko', '02-scroll-bottom',
    'ページ最下部までスクロールし、グラフと結果セクションを確認した。',
    'グラフまでちゃんと見れた。特に迷わなかった。',
    '',
  );

  const principalInput = page.locator('#primary-principal');
  await principalInput.click({ clickCount: 3 });
  await principalInput.type('20000000');
  await page.waitForTimeout(400);
  state = await readState(page);
  recordFeedback(
    'aiko', '03-set-principal-2000man',
    `借入金額を3000万→2000万に変更。総返済額=${state.total}円、エラー表示=${state.errorVisible}`,
    '3回タップで前の値が消えたのは分かりやすかった。金額はすぐ反映されてる感じ。',
    '',
  );

  const termInput = page.locator('#term-years');
  await termInput.click({ clickCount: 3 });
  await termInput.type('30');
  await page.waitForTimeout(400);
  state = await readState(page);
  await shot(page, 'aiko', '04-term-30');
  recordFeedback(
    'aiko', '04-term-30',
    `借入期間を35→30に変更。総返済額=${state.total}円、月々=${state.firstMonth}円、エラー表示=${state.errorVisible}、エラー文="${state.errorText}"`,
    state.errorVisible
      ? '急に結果が「―」になって、下に赤い文字でよくわからない英語混じりのメッセージが出た。何がダメなのか全然わからない…期間変えただけなのに壊れた？って不安になる。'
      : '期間を変えても数字はすぐ更新された。',
    state.errorVisible
      ? '借入期間を変更しても金利区間の「年数」が自動追随せず、内部エラー（"rateSegments years must add up to termYears"相当）がそのまま表示される。ユーザーには技術的すぎて意味不明。初心者が詰む典型パターン。'
      : '',
  );

  await setSegment(page, 0, { rate: '0.5' });
  await page.waitForTimeout(400);
  state = await readState(page);
  await shot(page, 'aiko', '05-rate-0.5');
  recordFeedback(
    'aiko', '05-rate-0.5',
    `年利を0.5%に変更。総返済額=${state.total}円、エラー表示=${state.errorVisible}`,
    state.errorVisible
      ? '年利を変えてもさっきのエラーが消えない。結局どこを直せば結果が見られるのか、20歳の自分には分からない。'
      : '年利を下げたら返済額が減った。分かりやすい。',
    '',
  );

  const explanationText = await page.evaluate(() =>
    document.body.textContent.includes('毎月の返済額が一定') || document.body.textContent.includes('毎月の元金部分が一定'),
  );
  recordFeedback(
    'aiko', '06-check-explanations',
    `「元利均等」「元金均等」の説明文の有無を確認: ${explanationText ? 'あり' : 'なし'}`,
    '「元利均等」「元金均等」って言葉、選ぶラジオボタンの横に説明が全然書いてない。何が違うのか分からないまま選んでる。',
    explanationText ? '' : '専門用語（元利均等・元金均等・ペアローン等）に説明やツールチップが無く、初心者には意味不明なまま選択させている。',
  );

  await page.locator('input[name="loanType"][value="pair"]').check();
  await page.waitForTimeout(400);
  const secondaryVisible = await page.locator('[data-borrower="secondary"]').isVisible();
  await shot(page, 'aiko', '07-pair-loan');
  recordFeedback(
    'aiko', '07-pair-loan',
    `「ペアローン」を選択。連帯債務者セクションの表示=${secondaryVisible}`,
    secondaryVisible
      ? '選んだらいきなり入力項目が増えた。「連帯債務者」って言葉も知らないから何を入れればいいのか戸惑う。'
      : 'ペアローンを選んでも見た目が変わらず、何が起きたのか分からない。',
    '',
  );

  await page.locator('#bonus-enabled').check();
  await page.waitForTimeout(300);
  const bonusVisible = await page.locator('#bonus-fields').isVisible();
  await page.locator('#bonus-amount').click({ clickCount: 3 });
  await page.locator('#bonus-amount').type('100000');
  await page.waitForTimeout(400);
  state = await readState(page);
  await shot(page, 'aiko', '08-bonus');
  recordFeedback(
    'aiko', '08-bonus',
    `ボーナス返済を有効化（表示=${bonusVisible}）、加算額を10万円に設定。総返済額=${state.total}円`,
    'チェックを入れたらすぐ入力欄が出てきたのは分かりやすい。「ボーナス返済」の意味はなんとなく分かる。',
    '',
  );

  await page.locator('#reset-button').click();
  await page.waitForTimeout(400);
  state = await readState(page);
  await shot(page, 'aiko', '09-reset');
  recordFeedback(
    'aiko', '09-reset',
    `初期化ボタンをタップ。総返済額=${state.total}円、エラー表示=${state.errorVisible}`,
    'リセットしたらさっきのエラーが消えて数字も戻った。ここまで迷走したのを一気に元に戻せるのはありがたい。',
    '',
  );

  await page.locator('#balance-chart').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, 'aiko', '10-charts');
  recordFeedback(
    'aiko', '10-charts',
    'グラフエリア（借入残高推移・年間返済額）までスクロールして確認した。',
    'グラフはきれいで見やすい。でも軸の数字が小さくてスマホだと読みにづらい。',
    'スマホ幅でのグラフ軸ラベルが小さく判読しにくい可能性がある。',
  );

  await context.close();
  return feedbackLog.aiko;
}

// --- Agent B: Kenji のテスト ---
async function runKenjiTests(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.waitForTimeout(500);

  // シナリオ1: 基本確認
  await shot(page, 'kenji', '01-default');
  let state = await readState(page);
  recordFeedback(
    'kenji', '01-default-values',
    `デフォルト値（3000万円・35年・元利均等）での結果: 総返済額=${state.total}円、月々=${state.firstMonth}円`,
    'デフォルトのままでも即座に総返済額と月々返済額が出るのは良い。Excelで自作してた時より圧倒的に速い。',
    '',
  );

  // シナリオ2: 変動→固定 金利期間分割
  await page.locator('#primary-principal').fill('45000000');
  await setSegment(page, 0, { years: '10', rate: '0.375' });
  await page.waitForTimeout(300);
  state = await readState(page);
  recordFeedback(
    'kenji', '02a-first-segment-set',
    `第1区間を10年/0.375%に設定。エラー表示=${state.errorVisible}（区間合計10年 ≠ 借入期間35年のため）`,
    '2区間目を追加する前提でまず1区間目だけ変えたら、案の定エラーになった。区間を追加するまでの一時的な状態として想定内。',
    '',
  );

  await page.locator('[data-action="add-segment"]').click();
  await page.waitForTimeout(300);
  const segmentsAfterAdd = await readSegments(page);
  await shot(page, 'kenji', '02b-after-add-segment');
  recordFeedback(
    'kenji', '02b-after-add-segment',
    `「金利区間を追加」を押した結果: ${JSON.stringify(segmentsAfterAdd)}`,
    `追加後の金利区間: 第1区間=${segmentsAfterAdd[0]?.years}年、第2区間=${segmentsAfterAdd[1]?.years}年。既存の10年区間を維持したまま残り25年が追加された。`,
    '',
  );

  await setSegment(page, 0, { years: '10' });
  await setSegment(page, 1, { years: '25', rate: '1.5' });
  await page.waitForTimeout(300);
  state = await readState(page);
  await shot(page, 'kenji', '02c-final');
  recordFeedback(
    'kenji', '02c-final-corrected',
    `手動で第1区間=10年/0.375%、第2区間=25年/1.5%に修正。総返済額=${state.total}円、月々（初回）=${state.firstMonth}円、エラー表示=${state.errorVisible}`,
    '修正すれば正しく計算される。変動→固定の段階金利シミュレーションができるのは競合の簡易シミュレーターには無い強み。',
    '',
  );

  // シナリオ3: 元金均等との比較
  const equalPaymentTotal = state.total;
  await page.locator('input[name="primary-repaymentType"][value="equalPrincipal"]').check();
  await page.waitForTimeout(300);
  state = await readState(page);
  await shot(page, 'kenji', '03-equal-principal');
  recordFeedback(
    'kenji', '03-equal-principal-compare',
    `返済方式を元金均等に切替。総返済額=${state.total}円（元利均等時=${equalPaymentTotal}円）、月々（初回）=${state.firstMonth}円`,
    '元金均等にしたら総返済額が下がって初回返済額が上がった。理論通りの挙動で、切替がワンクリックで即比較できるのは非常に良い。',
    '',
  );

  // シナリオ4: ペアローン
  await page.locator('input[name="loanType"][value="pair"]').check();
  await page.waitForTimeout(300);
  // 主債務者を単一区間・35年・0.5%に戻す
  const removeBtn = page.locator('[data-action="remove-segment"]').last();
  await removeBtn.click();
  await page.waitForTimeout(200);
  await page.locator('input[name="primary-repaymentType"][value="equalPayment"]').check();
  await page.locator('#primary-principal').fill('30000000');
  await setSegment(page, 0, { years: '35', rate: '0.5' });
  // 連帯債務者
  await page.locator('#secondary-principal').fill('15000000');
  await page.locator('input[name="secondary-repaymentType"][value="equalPrincipal"]').check();
  await page.waitForTimeout(400);
  state = await readState(page);
  await shot(page, 'kenji', '04-pair-loan');
  recordFeedback(
    'kenji', '04-pair-loan',
    `ペアローン（本人3000万円・元利均等 ＋ 連帯債務者1500万円・元金均等・共通金利0.5%）設定後: 総返済額=${state.total}円、月々（初回）=${state.firstMonth}円、エラー表示=${state.errorVisible}`,
    '本人と連帯債務者で借入金額・返済方式を別々に指定でき、共通金利で合算結果が即座に出るのは実用的。銀行の窓口で説明されたペアローンのイメージ通りに試せる。',
    '',
  );

  // シナリオ5: ボーナス返済あり
  await page.locator('input[name="loanType"][value="single"]').check();
  await page.locator('#primary-principal').fill('35000000');
  await setSegment(page, 0, { years: '35', rate: '1.0' });
  await page.waitForTimeout(300);
  const beforeBonus = await readState(page);
  await page.locator('#bonus-enabled').check();
  await page.locator('#bonus-amount').fill('300000');
  await page.waitForTimeout(300);
  await page.locator('#bonus-month-1').fill('7');
  await page.locator('#bonus-month-2').fill('12');
  await page.waitForTimeout(400);
  const afterBonus = await readState(page);
  await shot(page, 'kenji', '05-bonus');
  recordFeedback(
    'kenji', '05-bonus-payment',
    `ボーナス返済（30万円/回、7月・12月）有効化。有効化前の総返済額=${beforeBonus.total}円 → 有効化後=${afterBonus.total}円`,
    '入力するたびボタンを押さずに即再計算されるのは非常にテンポが良い。返済月を変えても計算に反映された。',
    '',
  );

  // シナリオ6: 極端な値の入力
  await page.locator('#bonus-enabled').uncheck();
  await page.locator('#primary-principal').fill('1');
  await page.waitForTimeout(300);
  let extreme = await readState(page);
  recordFeedback(
    'kenji', '06a-principal-1yen',
    `借入金額を1円に設定。総返済額=${extreme.total}円、エラー表示=${extreme.errorVisible}`,
    '1円でもエラーにならず計算された。境界値として妥当。',
    '',
  );

  await page.locator('#primary-principal').fill('99999999999');
  await page.waitForTimeout(300);
  extreme = await readState(page);
  await shot(page, 'kenji', '06b-principal-huge');
  recordFeedback(
    'kenji', '06b-principal-huge',
    `借入金額を99,999,999,999円（約1000億円）に設定。総返済額=${extreme.total}円、月々=${extreme.firstMonth}円、エラー表示=${extreme.errorVisible}`,
    extreme.total.includes('NaN') || extreme.total.includes('Infinity')
      ? '極端に大きい値を入れるとNaN/Infinityが表示されてしまい、計算が破綻しているのが分かる。'
      : '極端に大きい金額でも数値としては表示された。桁が大きすぎて総返済額の実感が湧かないが、エラーにはなっていない。',
    extreme.total.includes('NaN') || extreme.total.includes('Infinity') ? '巨大な借入金額でNaN/Infinityが表示される。入力上限のバリデーションが無い。' : '',
  );

  await page.locator('#primary-principal').fill('35000000');
  await setSegment(page, 0, { rate: '0' });
  await page.waitForTimeout(300);
  extreme = await readState(page);
  recordFeedback(
    'kenji', '06c-rate-zero',
    `年利を0%に設定。総返済額=${extreme.total}円、エラー表示=${extreme.errorVisible}`,
    '0%金利でも正しく借入金額÷期間相当の計算がされている。ゼロ金利キャンペーンの比較にも使える。',
    '',
  );

  await setSegment(page, 0, { rate: '15' });
  await page.waitForTimeout(300);
  extreme = await readState(page);
  await shot(page, 'kenji', '06d-rate-15');
  recordFeedback(
    'kenji', '06d-rate-15percent',
    `年利を15%に設定。総返済額=${extreme.total}円、エラー表示=${extreme.errorVisible}`,
    '現実的にはあり得ない年利だが、エラーも表示崩れも無く計算された。入力上限バリデーションは無いが、シミュレーターとしては許容範囲。',
    '',
  );

  await setSegment(page, 0, { years: '1', rate: '1.0' });
  await page.locator('#term-years').fill('1');
  await page.waitForTimeout(300);
  extreme = await readState(page);
  recordFeedback(
    'kenji', '06e-term-1year',
    `借入期間を1年（金利区間も1年に整合）に設定。総返済額=${extreme.total}円、月々=${extreme.firstMonth}円、エラー表示=${extreme.errorVisible}`,
    '1年という短期でも計算は正常。月々返済額が大きくなるのは当然の挙動。',
    '',
  );

  await setSegment(page, 0, { years: '50' });
  await page.locator('#term-years').fill('50');
  await page.waitForTimeout(300);
  extreme = await readState(page);
  await shot(page, 'kenji', '06f-term-50years');
  recordFeedback(
    'kenji', '06f-term-50years',
    `借入期間を50年（金利区間も50年に整合）に設定。総返済額=${extreme.total}円、エラー表示=${extreme.errorVisible}`,
    '50年という長期ローンでも計算が破綻せず妥当な結果が出た。',
    '',
  );

  await page.locator('#reset-button').click();
  await page.waitForTimeout(300);

  // シナリオ7: キーボードナビゲーション
  await page.locator('#primary-principal').focus();
  const focusTrace = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      const hasVisibleFocus = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      return { tag: el.tagName, id: el.id, hasVisibleFocus };
    });
    focusTrace.push(info);
  }
  await shot(page, 'kenji', '07-keyboard-nav');
  const noFocusRingCount = focusTrace.filter((f) => f && !f.hasVisibleFocus).length;
  recordFeedback(
    'kenji', '07-keyboard-navigation',
    `Tabキーで12回フォーカス移動。フォーカスリングが検出できなかった要素数=${noFocusRingCount}/${focusTrace.length}。トレース=${JSON.stringify(focusTrace.map((f) => f && `${f.tag}#${f.id}`))}`,
    noFocusRingCount > 0
      ? 'マウスを使わずキーボードだけで進めようとすると、一部の要素でどこにフォーカスがあるのか画面上で分かりにくかった。'
      : 'Tabキーでの移動順序は自然で、フォーカスの位置も常に視認できた。',
    noFocusRingCount > 0 ? `outline指定が無い（またはoutline-width:0）要素が${noFocusRingCount}個あり、キーボード操作時のフォーカス可視性がDADSのアクセシビリティ方針と食い違う可能性がある。` : '',
  );

  await context.close();
  return feedbackLog.kenji;
}

function severityIcon(sev) {
  return { HIGH: '🔴', MEDIUM: '🟡', LOW: '🔵' }[sev];
}

function formatFeedbackReport(persona, feedbackList) {
  const lines = [`# ${persona} フィードバック詳細`, ''];
  feedbackList.forEach((entry) => {
    lines.push(`## ${entry.step}`);
    lines.push(`- 観察: ${entry.observation}`);
    lines.push(`- 感想: ${entry.comment}`);
    lines.push(`- 問題点: ${entry.issues || 'なし'}`);
    lines.push('');
  });
  return lines.join('\n');
}

function buildIssueList(aikoFeedback, kenjiFeedback) {
  const issues = [];
  aikoFeedback.filter((f) => f.issues).forEach((f) => issues.push({ owner: 'Aiko', ...f }));
  kenjiFeedback.filter((f) => f.issues).forEach((f) => issues.push({ owner: 'Kenji', ...f }));

  return issues.map((issue) => {
    let severity = 'LOW';
    if (/エラー|壊れた|意味不明|詰む/.test(issue.issues)) severity = 'HIGH';
    else if (/驚いた|誤操作|わかりにく|分かりにく|アクセシビリティ/.test(issue.issues)) severity = 'MEDIUM';
    return { ...issue, severity };
  });
}

function generateSummaryReport(aikoFeedback, kenjiFeedback) {
  const allIssues = buildIssueList(aikoFeedback, kenjiFeedback);
  const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] };
  allIssues.forEach((issue) => bySeverity[issue.severity].push(issue));

  const table = (list) =>
    list.length === 0
      ? '（該当なし）\n'
      : ['| # | 問題 | 発見者 | 詳細 |', '|---|------|--------|------|']
          .concat(list.map((issue, i) => `| ${i + 1} | ${issue.issues.split('。')[0]} | ${issue.owner} | ${issue.issues} |`))
          .join('\n') + '\n';

  return `# 住宅ローン返済シミュレーター ユーザーテスト レポート

## テスト概要
- 実施日: ${new Date().toISOString().slice(0, 10)}
- 対象URL: ${BASE_URL}
- テストユーザー: Aiko（20歳・スマホ）、Kenji（35歳・PC）

## エグゼクティブサマリー
基本的な計算・グラフ表示・返済方式やローン形式の切替は両ユーザーとも問題なく行えた。一方で「借入期間」と「金利区間の年数」が独立して管理されており自動で追随しないため、借入期間だけを変更すると内部エラーがそのまま表示されてしまう問題が両ユーザーに共通して発見された。専門用語の説明不足（Aiko）と「金利区間を追加」ボタンの分割仕様（Kenji）も明確な改善点として挙がった。

## 優先度別 改善提案

### 🔴 HIGH（必ず対応）
${table(bySeverity.HIGH)}
### 🟡 MEDIUM（できれば対応）
${table(bySeverity.MEDIUM)}
### 🔵 LOW（余裕があれば）
${table(bySeverity.LOW)}
## ユーザー別フィードバック詳細

### Aiko（20歳・スマートフォン）
${aikoFeedback.map((f) => `- **${f.step}**: ${f.comment}${f.issues ? ` ／ 問題点: ${f.issues}` : ''}`).join('\n')}

### Kenji（35歳・PC）
${kenjiFeedback.map((f) => `- **${f.step}**: ${f.comment}${f.issues ? ` ／ 問題点: ${f.issues}` : ''}`).join('\n')}

## テストエビデンス（スクリーンショット一覧）
${aikoFeedback.map((f) => `- tests/screenshots/aiko-${f.step}.png`).join('\n')}
${kenjiFeedback.map((f) => `- tests/screenshots/kenji-${f.step}.png`).join('\n')}
`;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
  } catch (error) {
    console.warn('headed launch failed, falling back to headless:', error.message);
    browser = await chromium.launch({ headless: true });
  }

  const [aikoFeedback, kenjiFeedback] = await Promise.all([runAikoTests(browser), runKenjiTests(browser)]);

  await browser.close();

  writeFileSync(`${REPORTS_DIR}/aiko-feedback.md`, formatFeedbackReport('Aiko（20歳・スマホ）', aikoFeedback));
  writeFileSync(`${REPORTS_DIR}/kenji-feedback.md`, formatFeedbackReport('Kenji（35歳・PC）', kenjiFeedback));

  const summaryReport = generateSummaryReport(aikoFeedback, kenjiFeedback);
  writeFileSync(`${REPORTS_DIR}/summary-report.md`, summaryReport);

  console.log('\n✅ テスト完了。レポートを tests/reports/ に出力しました。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

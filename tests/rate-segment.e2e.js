import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:8080';

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // The Vite process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite開発サーバーが起動しませんでした');
}

async function main() {
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '8080'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(BASE_URL);
    const addButton = page.locator('[data-action="add-segment"]');
    assert.equal(await addButton.isEnabled(), true, '初期状態で追加ボタンが有効であること');

    await addButton.click();
    assert.equal(await page.locator('[data-rate-segment]').count(), 2, '追加後に区間が2つになること');
    assert.equal(await addButton.isEnabled(), true, '2区間の状態でも追加ボタンが有効であること');
    await addButton.click();
    assert.equal(await page.locator('[data-rate-segment]').count(), 3, '2区間からさらに追加して3区間になること');
    assert.equal(await page.locator('#form-error').count(), 0, '追加後にエラーが表示されないこと');
    assert.notEqual(await page.locator('#summary-total-payment').textContent(), '―', '追加後も結果が計算されること');

    // ここからは2区間での期間同期を検証する。
    await page.locator('[data-rate-segment]').nth(2).locator('[data-action="remove-segment"]').click();
    assert.equal(await page.locator('[data-rate-segment]').count(), 2, '3区間から削除して2区間に戻せること');

    const firstRate = page.locator('[data-rate-segment]').nth(0).locator('[data-rate-field="annualRatePercent"]');
    await firstRate.click();
    await firstRate.press('ControlOrMeta+A');
    await firstRate.press('Backspace');
    assert.equal(await firstRate.inputValue(), '0', '金利を削除した直後は0になること');
    await firstRate.type('1.5');
    assert.equal(await firstRate.inputValue(), '1.5', '0の後から入力しても先頭に0が残らないこと');

    const firstYears = page.locator('[data-rate-segment]').nth(0).locator('[data-rate-field="years"]');
    const lastYears = page.locator('[data-rate-segment]').nth(1).locator('[data-rate-field="years"]');
    await firstYears.fill('10');
    assert.equal(await firstYears.inputValue(), '10', '1期目が10年になること');
    assert.equal(await lastYears.inputValue(), '25', '2期目が残り25年に同期すること');

    await firstYears.fill('999');
    assert.equal(await firstYears.inputValue(), '34', '上限超過値が34年にクランプされること');
    assert.equal(await lastYears.inputValue(), '1', 'クランプ後も最後の区間を1年確保すること');

    await firstYears.fill('0');
    assert.equal(await firstYears.inputValue(), '1', '不正な下限値が1年にクランプされること');
    assert.equal(await lastYears.inputValue(), '34', 'クランプ後に2期目が34年へ同期すること');
    assert.equal(await page.locator('#form-error').count(), 0, '不正値入力後もエラーが表示されないこと');
    assert.notEqual(await page.locator('#summary-total-payment').textContent(), '―', '編集後も結果が計算されること');

    await page.locator('[data-rate-segment]').nth(0).locator('[data-action="remove-segment"]').click();
    assert.equal(await page.locator('[data-rate-segment]').count(), 1, '削除後に区間が1つになること');
    const remainingYears = page.locator('[data-rate-segment]').locator('[data-rate-field="years"]');
    assert.equal(await remainingYears.inputValue(), '35', '削除後に全期間へ戻ること');
    assert.equal(await remainingYears.getAttribute('readonly'), '', '削除後に年数入力がreadOnlyへ戻ること');
    assert.equal(await addButton.isEnabled(), true, '削除後も追加ボタンが有効であること');
    assert.equal(await page.locator('#form-error').count(), 0, '削除後にエラーが表示されないこと');
    assert.notEqual(await page.locator('#summary-total-payment').textContent(), '―', '削除後も結果が計算されること');

    await browser.close();
    console.log('✓ 金利区間の追加・同期・クランプ・削除・再計算 E2E');
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

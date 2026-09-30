import { simulate } from './amortization.js';
import { renderBalanceChart, renderYearlyChart } from './charts.js';

const DEFAULTS = Object.freeze({
  loanType: 'single',
  termYears: 35,
  principal: 30_000_000,
  repaymentType: 'equalPayment',
  annualRatePercent: 1.0,
  bonusEnabled: false,
  bonusAmountPerPayment: 0,
  bonusMonths: [8, 2],
});

const form = document.querySelector('#loan-form');
const summaryTotalPayment = document.querySelector('#summary-total-payment');
const summaryFirstMonthPayment = document.querySelector('#summary-first-month-payment');
const summaryMaxPayment = document.querySelector('#summary-max-payment');
const summaryMinPayment = document.querySelector('#summary-min-payment');
const summaryFirstMonthPeriod = document.querySelector('#summary-first-month-period');
const summaryMaxPeriod = document.querySelector('#summary-max-period');
const summaryMinPeriod = document.querySelector('#summary-min-period');
const balanceChart = document.querySelector('#balance-chart');
const yearlyChart = document.querySelector('#yearly-chart');
const formError = document.querySelector('#form-error');
const secondarySection = document.querySelector('[data-borrower="secondary"].borrower-section');
const bonusFields = document.querySelector('#bonus-fields');
const principalInputs = [...document.querySelectorAll('#primary-principal, #secondary-principal')];
const sharedSegmentContainer = document.querySelector('[data-rate-segments-shared]');
const sharedSegmentEditor = sharedSegmentContainer.closest('.rate-segment-editor');
const segmentTemplate = ({ years = DEFAULTS.termYears, annualRatePercent = DEFAULTS.annualRatePercent } = {}) => {
  const row = document.createElement('div');
  row.className = 'rate-segment';
  row.dataset.rateSegment = '';
  row.innerHTML = `
    <div class="rate-segment__field">
      <label>年数
        <input class="dads-input-text__input" type="number" data-rate-field="years" min="1" step="1" value="${years}">
      </label>
    </div>
    <div class="rate-segment__field">
      <label>年利（%）
        <input class="dads-input-text__input" type="number" data-rate-field="annualRatePercent" min="0" step="0.001" value="${annualRatePercent}">
      </label>
    </div>
    <button class="dads-button rate-segment__remove" data-size="sm" data-type="text" type="button" data-action="remove-segment">削除</button>
  `;
  return row;
};

function borrowerSection(key) {
  return document.querySelector(`[data-borrower="${key}"].borrower-section`);
}

function setSectionVisibility() {
  const isPair = form.elements.loanType.value === 'pair';
  secondarySection.hidden = !isPair;
  bonusFields.hidden = !form.elements['bonus-enabled'].checked;
}

function updateRemoveButtons() {
  const rows = [...sharedSegmentEditor.querySelectorAll('[data-rate-segment]')];
  rows.forEach((row) => {
    const button = row.querySelector('[data-action="remove-segment"]');
    button.disabled = rows.length === 1;
  });
}

function getRemainingYears(termYears) {
  const yearsValues = [...sharedSegmentContainer.querySelectorAll('[data-rate-field="years"]')]
    .map((input) => Number(input.value));
  const remainingYears = termYears - yearsValues.reduce((sum, years) => sum + years, 0);
  const validYears = Number.isInteger(termYears)
    && yearsValues.every((years) => Number.isInteger(years) && years > 0)
    && Number.isInteger(remainingYears);
  return validYears ? remainingYears : null;
}

function updateAddButton(termYears = readNumber(form.elements.termYears)) {
  const button = sharedSegmentEditor.querySelector('[data-action="add-segment"]');
  const remainingYears = getRemainingYears(termYears);
  button.disabled = remainingYears === null || remainingYears <= 0;
}

function syncLastSegmentYears(termYears) {
  const lastYearsInput = sharedSegmentContainer.querySelector('[data-rate-segment]:last-child [data-rate-field="years"]');
  const remainingYears = getRemainingYears(termYears);
  if (!lastYearsInput || remainingYears === null) return;

  lastYearsInput.value = Math.max(1, Math.round(Number(lastYearsInput.value) + remainingYears));
}

function renderInitialSegments() {
  const termYears = readNumber(form.elements.termYears);
  const years = Number.isInteger(termYears) && termYears > 0 ? termYears : DEFAULTS.termYears;
  sharedSegmentContainer.replaceChildren(segmentTemplate({ years }));
  updateRemoveButtons();
  updateAddButton();
}

function addSegment() {
  const lastRow = sharedSegmentContainer.lastElementChild;
  const rateInput = lastRow?.querySelector('[data-rate-field="annualRatePercent"]');
  const termYears = readNumber(form.elements.termYears);
  const remainingYears = getRemainingYears(termYears);
  if (remainingYears === null || remainingYears <= 0) return;

  sharedSegmentContainer.append(segmentTemplate({ years: remainingYears, annualRatePercent: rateInput?.value || DEFAULTS.annualRatePercent }));
  updateRemoveButtons();
  updateAddButton(termYears);
}

function removeSegment(button) {
  const row = button.closest('[data-rate-segment]');
  const rows = sharedSegmentContainer.querySelectorAll('[data-rate-segment]');
  if (rows.length > 1) row.remove();
  updateRemoveButtons();
  updateAddButton();
}

function readNumber(input) {
  return Number(input.value.replace(/,/g, ''));
}

function formatPrincipalInput(input) {
  const value = Number(input.value.replace(/,/g, ''));
  if (!Number.isFinite(value) || value === 0) return;
  input.value = value.toLocaleString('ja-JP');
}

function readBorrower(key) {
  const section = borrowerSection(key);
  const repaymentType = section.querySelector('[data-field="repaymentType"]:checked').value;
  return {
    principal: readNumber(section.querySelector('[data-field="principal"]')),
    repaymentType,
  };
}

function buildSimulationInput() {
  const loanType = form.elements.loanType.value;
  return {
    loanType,
    termYears: readNumber(form.elements.termYears),
    rateSegments: [...sharedSegmentContainer.querySelectorAll('[data-rate-segment]')].map((row) => ({
      years: readNumber(row.querySelector('[data-rate-field="years"]')),
      annualRatePercent: readNumber(row.querySelector('[data-rate-field="annualRatePercent"]')),
    })),
    borrowers: loanType === 'pair' ? [readBorrower('primary'), readBorrower('secondary')] : [readBorrower('primary')],
    bonus: {
      enabled: form.elements['bonus-enabled'].checked,
      amountPerPayment: readNumber(form.elements['bonus-amount']),
      months: [readNumber(form.elements['bonus-month-1']), readNumber(form.elements['bonus-month-2'])],
    },
  };
}

function formatMonthPeriod(monthIndex) {
  const year = Math.floor((monthIndex - 1) / 12);
  const month = ((monthIndex - 1) % 12) + 1;
  return `${year}年${month}ヶ月目`;
}

function calculate() {
  try {
    const result = simulate(buildSimulationInput());
    const payments = result.monthly.map((record) => record.payment);
    const maxPayment = Math.max(...payments);
    const minPayment = Math.min(...payments);
    const maxRecord = result.monthly.find((record) => record.payment === maxPayment);
    const minRecord = result.monthly.find((record) => record.payment === minPayment);

    summaryTotalPayment.textContent = result.totalPayment.toLocaleString('ja-JP');
    summaryFirstMonthPayment.textContent = result.monthly[0].payment.toLocaleString('ja-JP');
    summaryFirstMonthPeriod.textContent = formatMonthPeriod(result.monthly[0].monthIndex);
    summaryMaxPayment.textContent = maxPayment.toLocaleString('ja-JP');
    summaryMaxPeriod.textContent = formatMonthPeriod(maxRecord.monthIndex);
    summaryMinPayment.textContent = minPayment.toLocaleString('ja-JP');
    summaryMinPeriod.textContent = formatMonthPeriod(minRecord.monthIndex);
    renderBalanceChart(balanceChart, result.monthly);
    renderYearlyChart(yearlyChart, result.yearly);
    formError.hidden = true;
    formError.textContent = '';
  } catch (error) {
    summaryTotalPayment.textContent = '―';
    summaryFirstMonthPayment.textContent = '―';
    summaryFirstMonthPeriod.textContent = '―';
    summaryMaxPayment.textContent = '―';
    summaryMaxPeriod.textContent = '―';
    summaryMinPayment.textContent = '―';
    summaryMinPeriod.textContent = '―';
    formError.textContent = error instanceof Error ? error.message : '計算できませんでした。入力値を確認してください。';
    formError.hidden = false;
  }
}

function resetForm() {
  form.elements.loanType.value = DEFAULTS.loanType;
  form.elements.termYears.value = DEFAULTS.termYears;
  const primary = borrowerSection('primary');
  const secondary = borrowerSection('secondary');
  [primary, secondary].forEach((section) => {
    section.querySelector('[data-field="principal"]').value = DEFAULTS.principal;
    section.querySelector('[data-field="repaymentType"][value="equalPayment"]').checked = true;
  });
  form.elements['bonus-enabled'].checked = DEFAULTS.bonusEnabled;
  form.elements['bonus-amount'].value = DEFAULTS.bonusAmountPerPayment;
  form.elements['bonus-month-1'].value = DEFAULTS.bonusMonths[0];
  form.elements['bonus-month-2'].value = DEFAULTS.bonusMonths[1];
  renderInitialSegments();
  principalInputs.forEach(formatPrincipalInput);
  setSectionVisibility();
  calculate();
}

form.addEventListener('input', (event) => {
  if (event.target.matches('[name="termYears"]')) {
    const termYears = readNumber(event.target);
    syncLastSegmentYears(termYears);
    updateAddButton(termYears);
  } else if (event.target.matches('[data-rate-field="years"]')) {
    updateAddButton();
  }

  if (event.target.matches('[data-rate-field], [data-field], [name="loanType"], [name="termYears"], #bonus-enabled, #bonus-amount, #bonus-month-1, #bonus-month-2')) {
    setSectionVisibility();
    calculate();
  }
});


form.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton?.dataset.action === 'add-segment') {
    addSegment();
    calculate();
  }
  if (actionButton?.dataset.action === 'remove-segment') {
    removeSegment(actionButton);
    calculate();
  }
});

document.querySelector('#reset-button').addEventListener('click', resetForm);

principalInputs.forEach((input) => {
  input.addEventListener('focus', () => {
    input.value = input.value.replace(/,/g, '');
  });
  input.addEventListener('blur', () => formatPrincipalInput(input));
});

renderInitialSegments();
principalInputs.forEach(formatPrincipalInput);
setSectionVisibility();
calculate();

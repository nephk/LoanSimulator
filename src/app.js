import { simulate } from './amortization.js';

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
const resultDebug = document.querySelector('#result-debug');
const formError = document.querySelector('#form-error');
const secondarySection = document.querySelector('[data-borrower="secondary"].borrower-section');
const bonusFields = document.querySelector('#bonus-fields');
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

function updateRemoveButtons(section) {
  const rows = [...section.querySelectorAll('[data-rate-segment]')];
  rows.forEach((row) => {
    const button = row.querySelector('[data-action="remove-segment"]');
    button.disabled = rows.length === 1;
  });
}

function renderInitialSegments(key) {
  const section = borrowerSection(key);
  const container = section.querySelector('[data-rate-segments]');
  container.replaceChildren(segmentTemplate());
  updateRemoveButtons(section);
}

function addSegment(button) {
  const section = button.closest('.rate-segment-editor').closest('.borrower-section');
  const container = section.querySelector('[data-rate-segments]');
  const lastRow = container.lastElementChild;
  const yearsInput = lastRow?.querySelector('[data-rate-field="years"]');
  const rateInput = lastRow?.querySelector('[data-rate-field="annualRatePercent"]');
  const previousYears = Number(yearsInput?.value);
  if (!Number.isInteger(previousYears) || previousYears <= 1) return;

  const firstYears = Math.ceil(previousYears / 2);
  const secondYears = Math.floor(previousYears / 2);
  yearsInput.value = firstYears;
  container.append(segmentTemplate({ years: secondYears, annualRatePercent: rateInput?.value || DEFAULTS.annualRatePercent }));
  updateRemoveButtons(section);
}

function removeSegment(button) {
  const section = button.closest('.rate-segment-editor').closest('.borrower-section');
  const row = button.closest('[data-rate-segment]');
  const rows = section.querySelectorAll('[data-rate-segment]');
  if (rows.length > 1) row.remove();
  updateRemoveButtons(section);
}

function readNumber(input) {
  return Number(input.value);
}

function readBorrower(key) {
  const section = borrowerSection(key);
  const repaymentType = section.querySelector('[data-field="repaymentType"]:checked').value;
  const rateSegments = [...section.querySelectorAll('[data-rate-segment]')].map((row) => ({
    years: readNumber(row.querySelector('[data-rate-field="years"]')),
    annualRatePercent: readNumber(row.querySelector('[data-rate-field="annualRatePercent"]')),
  }));
  return {
    principal: readNumber(section.querySelector('[data-field="principal"]')),
    repaymentType,
    rateSegments,
  };
}

function buildSimulationInput() {
  const loanType = form.elements.loanType.value;
  return {
    loanType,
    termYears: readNumber(form.elements.termYears),
    borrowers: loanType === 'pair' ? [readBorrower('primary'), readBorrower('secondary')] : [readBorrower('primary')],
    bonus: {
      enabled: form.elements['bonus-enabled'].checked,
      amountPerPayment: readNumber(form.elements['bonus-amount']),
      months: [readNumber(form.elements['bonus-month-1']), readNumber(form.elements['bonus-month-2'])],
    },
  };
}

function calculate() {
  try {
    const result = simulate(buildSimulationInput());
    resultDebug.textContent = JSON.stringify({
      totalPayment: result.totalPayment,
      monthlyCount: result.monthly.length,
      yearlyCount: result.yearly.length,
    }, null, 2);
    formError.hidden = true;
    formError.textContent = '';
  } catch (error) {
    resultDebug.textContent = '';
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
  renderInitialSegments('primary');
  renderInitialSegments('secondary');
  setSectionVisibility();
  calculate();
}

form.addEventListener('input', (event) => {
  if (event.target.matches('[data-rate-field], [data-field], [name="loanType"], [name="termYears"], #bonus-enabled, #bonus-amount, #bonus-month-1, #bonus-month-2')) {
    setSectionVisibility();
    calculate();
  }
});


form.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton?.dataset.action === 'add-segment') {
    addSegment(actionButton);
    calculate();
  }
  if (actionButton?.dataset.action === 'remove-segment') {
    removeSegment(actionButton);
    calculate();
  }
});

document.querySelector('#reset-button').addEventListener('click', resetForm);

renderInitialSegments('primary');
renderInitialSegments('secondary');
setSectionVisibility();
calculate();

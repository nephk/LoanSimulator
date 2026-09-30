import assert from 'node:assert/strict';
import test from 'node:test';
import { simulate } from './amortization.js';

const fixedRate = (principal, repaymentType = 'equalPayment') => ({
  principal,
  repaymentType,
});

function pmt(principal, annualRatePercent, termYears) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const months = termYears * 12;
  return principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
}

test('単身・単一金利の元利均等返済はPMTと一致し、最終残高が0になる', () => {
  const result = simulate({
    loanType: 'single',
    termYears: 1,
    rateSegments: [{ years: 1, annualRatePercent: 1.2 }],
    borrowers: [fixedRate(1_000_000)],
    bonus: { enabled: false },
  });

  assert.equal(result.monthly.length, 12);
  assert.equal(result.monthly[0].payment, Math.round(pmt(1_000_000, 1.2, 1)));
  assert.equal(result.monthly.at(-1).balance, 0);
  assert.equal(result.yearly.length, 1);
  assert.equal(result.totalPayment, result.yearly[0].totalPayment);
});

test('ペアローン・共通の期間分割金利は各人を独立計算して月ごとに合算する', () => {
  const rateSegments = [{ years: 1, annualRatePercent: 1 }, { years: 1, annualRatePercent: 2 }];
  const borrowerA = fixedRate(12_000_000);
  const borrowerB = fixedRate(8_000_000, 'equalPrincipal');
  const pair = simulate({ loanType: 'pair', termYears: 2, rateSegments, borrowers: [borrowerA, borrowerB], bonus: { enabled: false } });
  const individualA = simulate({ loanType: 'single', termYears: 2, rateSegments, borrowers: [borrowerA], bonus: { enabled: false } });
  const individualB = simulate({ loanType: 'single', termYears: 2, rateSegments, borrowers: [borrowerB], bonus: { enabled: false } });

  assert.equal(pair.monthly.length, 24);
  pair.monthly.forEach((record, index) => {
    assert.equal(record.payment, individualA.monthly[index].payment + individualB.monthly[index].payment);
    assert.equal(record.principalPaid, individualA.monthly[index].principalPaid + individualB.monthly[index].principalPaid);
    assert.equal(record.interestPaid, individualA.monthly[index].interestPaid + individualB.monthly[index].interestPaid);
    assert.equal(record.balance, individualA.monthly[index].balance + individualB.monthly[index].balance);
  });
  assert.notEqual(pair.monthly[11].payment, pair.monthly[12].payment);
  assert.equal(pair.monthly.at(-1).balance, 0);
});

test('ボーナス返済は指定月にのみ加算され、残高と集計に反映される', () => {
  const input = {
    loanType: 'single',
    termYears: 2,
    rateSegments: [{ years: 2, annualRatePercent: 1.2 }],
    borrowers: [fixedRate(2_400_000)],
  };
  const withoutBonus = simulate({ ...input, bonus: { enabled: false } });
  const withBonus = simulate({ ...input, bonus: { enabled: true, amountPerPayment: 100_000, months: [2, 8] } });

  assert.ok(withBonus.monthly[1].principalPaid >= withoutBonus.monthly[1].principalPaid + 100_000);
  assert.ok(withBonus.monthly[7].principalPaid >= withoutBonus.monthly[7].principalPaid + 100_000);
  assert.equal(withBonus.monthly[0].payment, withoutBonus.monthly[0].payment);
  assert.ok(withBonus.totalPayment < withoutBonus.totalPayment);
  assert.equal(withBonus.monthly.at(-1).balance, 0);
  assert.equal(withBonus.yearly[0].totalPayment, withBonus.monthly.slice(0, 12).reduce((sum, r) => sum + r.payment, 0));
});

test('入力値を検証し、不正な値はErrorを投げる', () => {
  const base = { loanType: 'single', termYears: 1, rateSegments: [{ years: 1, annualRatePercent: 1 }], borrowers: [fixedRate(1_000_000)], bonus: { enabled: false } };
  assert.throws(() => simulate({ ...base, termYears: 0 }), Error);
  assert.throws(() => simulate({ ...base, borrowers: [fixedRate(0)] }), Error);
  assert.throws(() => simulate({ ...base, rateSegments: [{ years: 1, annualRatePercent: -1 }] }), Error);
  assert.throws(() => simulate({ ...base, rateSegments: [{ years: 2, annualRatePercent: 1 }] }), Error);
});

test('各月の金額が整合し、元金合計と残高推移が円単位で一致する', () => {
  const principal = 3_333_333;
  const result = simulate({
    loanType: 'single',
    termYears: 5,
    rateSegments: [{ years: 5, annualRatePercent: 1.37 }],
    borrowers: [fixedRate(principal, 'equalPrincipal')],
    bonus: { enabled: false },
  });

  assert.equal(result.monthly.reduce((sum, record) => sum + record.principalPaid, 0), principal);
  result.monthly.forEach((record, index) => {
    assert.equal(record.payment, record.principalPaid + record.interestPaid);
    if (index > 0) assert.equal(record.balance, result.monthly[index - 1].balance - record.principalPaid);
  });
});

test('ボーナス無効時は未入力のボーナス欄を検証せず計算できる', () => {
  const result = simulate({
    loanType: 'single',
    termYears: 1,
    rateSegments: [{ years: 1, annualRatePercent: 1.2 }],
    borrowers: [fixedRate(1_000_000)],
    bonus: { enabled: false, amountPerPayment: Number.NaN, months: [0] },
  });

  assert.equal(result.monthly.length, 12);
  assert.equal(result.monthly.at(-1).balance, 0);
});

test('累積丸めで低額・長期・0%金利でも負の返済額を出さない', () => {
  const principal = 123;
  const result = simulate({
    loanType: 'single',
    termYears: 20,
    rateSegments: [{ years: 20, annualRatePercent: 0 }],
    borrowers: [fixedRate(principal)],
    bonus: { enabled: false },
  });

  assert.ok(result.monthly.every((record) => record.principalPaid >= 0 && record.payment >= 0));
  assert.ok(result.monthly.every((record) => record.payment === record.principalPaid + record.interestPaid));
  assert.equal(result.monthly.reduce((sum, record) => sum + record.principalPaid, 0), principal);
  assert.equal(result.monthly.at(-1).balance, 0);
});

test('nullのボーナスをデフォルト値として扱い、重複月は拒否する', () => {
  const input = {
    loanType: 'single',
    termYears: 1,
    rateSegments: [{ years: 1, annualRatePercent: 1 }],
    borrowers: [fixedRate(1_000_000)],
  };
  assert.equal(simulate({ ...input, bonus: null }).monthly.length, 12);
  assert.throws(() => simulate({
    ...input,
    bonus: { enabled: true, amountPerPayment: 100_000, months: [6, 6] },
  }), Error);
});

test('早期完済のボーナス返済でも表示額の検算が崩れない', () => {
  const principal = 10_000;
  const result = simulate({
    loanType: 'single',
    termYears: 10,
    rateSegments: [{ years: 10, annualRatePercent: 0 }],
    borrowers: [fixedRate(principal)],
    bonus: { enabled: true, amountPerPayment: 10_000, months: [2, 8] },
  });

  assert.ok(result.monthly.every((record) => record.principalPaid >= 0 && record.payment >= 0));
  assert.ok(result.monthly.every((record) => record.payment === record.principalPaid + record.interestPaid));
  assert.equal(result.monthly.reduce((sum, record) => sum + record.principalPaid, 0), principal);
});

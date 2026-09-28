/**
 * @typedef {{ years: number, annualRatePercent: number }} RateSegment
 * @typedef {{ principal: number, repaymentType: 'equalPayment'|'equalPrincipal', rateSegments: RateSegment[] }} BorrowerInput
 * @typedef {{ enabled: boolean, amountPerPayment: number, months?: number[] }} BonusPayment
 * @typedef {{ loanType: 'single'|'pair', termYears: number, borrowers: BorrowerInput[], bonus: BonusPayment }} SimulationInput
 * @typedef {{ monthIndex: number, payment: number, principalPaid: number, interestPaid: number, balance: number }} MonthlyRecord
 * @typedef {{ totalPayment: number, monthly: MonthlyRecord[], yearly: { year: number, totalPayment: number, principalPaid: number, interestPaid: number }[] }} SimulationResult
 *
 * Pure loan amortization calculations.
 *
 * Amounts are rounded to the nearest yen for each monthly record.  A rate
 * segment is a number of whole years, and a new schedule is calculated from
 * the outstanding balance at the beginning of each segment.
 */

const MONTHS_PER_YEAR = 12;
const DEFAULT_BONUS_MONTHS = [8, 2];

const roundYen = (value) => Math.round(value);

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function validatePositive(value, name) {
  assertFiniteNumber(value, name);
  if (value <= 0) throw new Error(`${name} must be greater than 0`);
}

function validateNonNegative(value, name) {
  assertFiniteNumber(value, name);
  if (value < 0) throw new Error(`${name} must be greater than or equal to 0`);
}

function normalizeBonus(bonus = {}) {
  const enabled = Boolean(bonus.enabled);
  if (!enabled) {
    return { enabled: false, amountPerPayment: 0, months: [...DEFAULT_BONUS_MONTHS] };
  }

  const amountPerPayment = bonus.amountPerPayment === undefined ? 0 : bonus.amountPerPayment;
  validateNonNegative(amountPerPayment, 'bonus.amountPerPayment');

  const months = bonus.months === undefined ? DEFAULT_BONUS_MONTHS : bonus.months;
  if (!Array.isArray(months) || months.length !== 2 || months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
    throw new Error('bonus.months must contain two month numbers between 1 and 12');
  }

  return { enabled: true, amountPerPayment, months: [...months] };
}

function validateRateSegments(rateSegments, termYears, name) {
  if (!Array.isArray(rateSegments) || rateSegments.length === 0) {
    throw new Error(`${name} must contain at least one rate segment`);
  }

  let yearsTotal = 0;
  for (const [index, segment] of rateSegments.entries()) {
    validatePositive(segment?.years, `${name}[${index}].years`);
    if (!Number.isInteger(segment.years)) {
      throw new Error(`${name}[${index}].years must be a whole number`);
    }
    validateNonNegative(segment.annualRatePercent, `${name}[${index}].annualRatePercent`);
    yearsTotal += segment.years;
  }

  if (yearsTotal !== termYears) {
    throw new Error(`${name} years must add up to termYears`);
  }
}

function validateInput(input) {
  if (!input || (input.loanType !== 'single' && input.loanType !== 'pair')) {
    throw new Error("loanType must be 'single' or 'pair'");
  }
  validatePositive(input.termYears, 'termYears');
  if (!Number.isInteger(input.termYears)) throw new Error('termYears must be a whole number');

  const expectedBorrowers = input.loanType === 'single' ? 1 : 2;
  if (!Array.isArray(input.borrowers) || input.borrowers.length !== expectedBorrowers) {
    throw new Error(`borrowers must contain ${expectedBorrowers} item(s)`);
  }

  input.borrowers.forEach((borrower, index) => {
    validatePositive(borrower?.principal, `borrowers[${index}].principal`);
    if (borrower.repaymentType !== 'equalPayment' && borrower.repaymentType !== 'equalPrincipal') {
      throw new Error(`borrowers[${index}].repaymentType is invalid`);
    }
    validateRateSegments(borrower.rateSegments, input.termYears, `borrowers[${index}].rateSegments`);
  });

  return normalizeBonus(input.bonus);
}

function monthlyRate(annualRatePercent) {
  return annualRatePercent / 100 / MONTHS_PER_YEAR;
}

function paymentForRemainingBalance(balance, monthlyInterestRate, remainingMonths) {
  if (remainingMonths <= 0 || balance <= 0) return 0;
  if (monthlyInterestRate === 0) return balance / remainingMonths;
  return balance * monthlyInterestRate / (1 - (1 + monthlyInterestRate) ** -remainingMonths);
}

function segmentAtMonth(rateSegments, monthIndex) {
  let elapsedMonths = 0;
  for (const segment of rateSegments) {
    const segmentMonths = segment.years * MONTHS_PER_YEAR;
    if (monthIndex <= elapsedMonths + segmentMonths) return segment;
    elapsedMonths += segmentMonths;
  }
  return rateSegments[rateSegments.length - 1];
}

function simulateBorrower(borrower, termYears, bonus) {
  const totalMonths = termYears * MONTHS_PER_YEAR;
  const principalYen = roundYen(borrower.principal);
  let balance = borrower.principal;
  let displayedPrincipalTotal = 0;
  let previousSegment;
  let scheduledPayment = 0;
  let scheduledPrincipal = 0;
  const records = [];

  for (let monthIndex = 1; monthIndex <= totalMonths; monthIndex += 1) {
    const segment = segmentAtMonth(borrower.rateSegments, monthIndex);
    const rate = monthlyRate(segment.annualRatePercent);
    const remainingMonths = totalMonths - monthIndex + 1;

    if (segment !== previousSegment) {
      if (borrower.repaymentType === 'equalPayment') {
        scheduledPayment = paymentForRemainingBalance(balance, rate, remainingMonths);
      } else {
        scheduledPrincipal = balance / remainingMonths;
      }
      previousSegment = segment;
    }

    const interest = balance * rate;
    let principalPaid = borrower.repaymentType === 'equalPayment'
      ? scheduledPayment - interest
      : scheduledPrincipal;
    const bonusPayment = bonus.enabled && bonus.months.includes(((monthIndex - 1) % 12) + 1)
      ? bonus.amountPerPayment
      : 0;

    principalPaid = Math.min(principalPaid + bonusPayment, balance);
    const payment = interest + principalPaid;
    balance = Math.max(0, balance - principalPaid);

    const interestPaid = roundYen(interest);
    let paymentPaid = roundYen(payment);
    let displayedPrincipal = paymentPaid - interestPaid;

    // When the loan reaches zero (or at the scheduled final month), make the
    // displayed principal total exactly equal the original yen principal.
    if (balance === 0 || monthIndex === totalMonths) {
      displayedPrincipal = principalYen - displayedPrincipalTotal;
      paymentPaid = displayedPrincipal + interestPaid;
    }
    displayedPrincipalTotal += displayedPrincipal;

    records.push({
      monthIndex,
      payment: paymentPaid,
      principalPaid: displayedPrincipal,
      interestPaid,
      balance: Math.max(0, principalYen - displayedPrincipalTotal),
    });
  }

  return records;
}

function sumField(records, field) {
  return records.reduce((sum, record) => sum + record[field], 0);
}

function aggregateMonthly(recordsByBorrower) {
  const totalMonths = recordsByBorrower[0]?.length ?? 0;
  return Array.from({ length: totalMonths }, (_, index) => {
    const records = recordsByBorrower.map((records) => records[index]);
    return {
      monthIndex: index + 1,
      payment: sumField(records, 'payment'),
      principalPaid: sumField(records, 'principalPaid'),
      interestPaid: sumField(records, 'interestPaid'),
      balance: sumField(records, 'balance'),
    };
  });
}

/**
 * Simulate a single or pair loan.
 * @param {SimulationInput} input
 * @returns {SimulationResult}
 */
export function simulate(input) {
  const bonus = validateInput(input);
  const borrowerSchedules = input.borrowers.map((borrower) => simulateBorrower(borrower, input.termYears, bonus));
  const monthly = aggregateMonthly(borrowerSchedules);
  const yearly = Array.from({ length: input.termYears }, (_, yearIndex) => {
    const records = monthly.slice(yearIndex * MONTHS_PER_YEAR, (yearIndex + 1) * MONTHS_PER_YEAR);
    return {
      year: yearIndex + 1,
      totalPayment: sumField(records, 'payment'),
      principalPaid: sumField(records, 'principalPaid'),
      interestPaid: sumField(records, 'interestPaid'),
    };
  });

  return {
    totalPayment: sumField(monthly, 'payment'),
    monthly,
    yearly,
  };
}

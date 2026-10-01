import { useEffect, useState } from 'react';
import { simulate } from '../../amortization.js';
import { Button } from '../../components/dads/Button';
import { ErrorText } from '../../components/dads/ErrorText';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { Legend } from '../../components/dads/Legend';
import { NotificationBanner, NotificationBannerBody } from '../../components/dads/NotificationBanner';
import { BalanceChart } from './BalanceChart';
import { BorrowerSection } from './BorrowerSection';
import { BonusFields } from './BonusFields';
import { LoanTypeField } from './LoanTypeField';
import { RateSegmentEditor } from './RateSegmentEditor';
import { ResultSummary } from './ResultSummary';
import { TermYearsField } from './TermYearsField';
import type { BonusPayment, BorrowerInput, LoanType, RateSegment, SimulationInput, SimulationResult } from './types';
import { YearlyChart } from './YearlyChart';

const DEFAULTS = {
  loanType: 'single' as LoanType,
  termYears: 35,
  principal: 30_000_000,
  repaymentType: 'equalPayment' as const,
  annualRatePercent: 1,
  bonus: { enabled: false, amountPerPayment: 0, months: [8, 2] } as BonusPayment,
};

function syncLastSegment(segments: RateSegment[], termYears: number) {
  if (!Number.isInteger(termYears) || segments.length === 0) return segments;
  const total = segments.reduce((sum, segment) => sum + segment.years, 0);
  const lastIndex = segments.length - 1;
  const next = segments.map((segment, index) => index === lastIndex ? { ...segment, years: Math.max(1, Math.round(segment.years + termYears - total)) } : segment);
  return next;
}

function buildInput(loanType: LoanType, termYears: string, rateSegments: RateSegment[], primary: BorrowerInput, secondary: BorrowerInput, bonus: BonusPayment): SimulationInput {
  return { loanType, termYears: Number(termYears), rateSegments, borrowers: loanType === 'pair' ? [primary, secondary] : [primary], bonus };
}

export function LoanForm() {
  const [loanType, setLoanType] = useState<LoanType>(DEFAULTS.loanType);
  const [termYears, setTermYears] = useState(String(DEFAULTS.termYears));
  const [rateSegments, setRateSegments] = useState<RateSegment[]>([{ years: DEFAULTS.termYears, annualRatePercent: DEFAULTS.annualRatePercent }]);
  const [primary, setPrimary] = useState<BorrowerInput>({ principal: DEFAULTS.principal, repaymentType: DEFAULTS.repaymentType });
  const [secondary, setSecondary] = useState<BorrowerInput>({ principal: DEFAULTS.principal, repaymentType: DEFAULTS.repaymentType });
  const [bonus, setBonus] = useState<BonusPayment>(DEFAULTS.bonus);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const nextSegments = syncLastSegment(rateSegments, Number(termYears));
    if (nextSegments !== rateSegments) setRateSegments(nextSegments);
  }, [termYears]);

  useEffect(() => {
    try {
      const next = simulate(buildInput(loanType, termYears, rateSegments, primary, secondary, bonus));
      setResult(next);
      setError(null);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : '計算できませんでした。入力値を確認してください。');
    }
  }, [loanType, termYears, rateSegments, primary, secondary, bonus]);

  const reset = () => {
    setLoanType(DEFAULTS.loanType);
    setTermYears(String(DEFAULTS.termYears));
    setRateSegments([{ years: DEFAULTS.termYears, annualRatePercent: DEFAULTS.annualRatePercent }]);
    setPrimary({ principal: DEFAULTS.principal, repaymentType: DEFAULTS.repaymentType });
    setSecondary({ principal: DEFAULTS.principal, repaymentType: DEFAULTS.repaymentType });
    setBonus({ ...DEFAULTS.bonus, months: [...DEFAULTS.bonus.months] });
    setResetKey((value) => value + 1);
  };

  return (
    <form id='loan-form' className='grid gap-6' onSubmit={(event) => event.preventDefault()} noValidate>
      <div className='loan-form__top grid gap-6'>
        <section className='rounded-8 border border-solid-gray-300 p-6' aria-labelledby='loan-overview-title'>
          <h2 id='loan-overview-title' className='mb-5 text-std-20B-150 text-solid-gray-900'>基本条件</h2>
          <div className='grid gap-5'>
            <LoanTypeField loanType={loanType} onChange={setLoanType} />
            <TermYearsField value={termYears} onChange={setTermYears} />
            <RateSegmentEditor termYears={Number(termYears)} segments={rateSegments} onChange={setRateSegments} />
            <BonusFields bonus={bonus} onChange={setBonus} embedded />
          </div>
        </section>
        <div className='grid gap-6'>
          <BorrowerSection key={`primary-${resetKey}`} borrowerKey='primary' borrower={primary} onChange={setPrimary} />
          {loanType === 'pair' && <BorrowerSection key={`secondary-${resetKey}`} borrowerKey='secondary' borrower={secondary} onChange={setSecondary} />}
        </div>
      </div>
      <div className='flex flex-wrap gap-3'><Button id='reset-button' size='md' variant='outline' type='button' onClick={reset}>初期化</Button></div>
      {error && <div id='form-error' role='alert'><NotificationBanner bannerStyle='standard' type='error' title='入力エラー' headingLevel='h2'><NotificationBannerBody><ErrorText>{error}</ErrorText></NotificationBannerBody></NotificationBanner></div>}
      <section className='rounded-8 border border-solid-gray-300 p-6' aria-labelledby='result-title'>
        <h2 id='result-title' className='mb-5 text-std-20B-150 text-solid-gray-900'>計算結果</h2>
        <ResultSummary result={result} />
        {result && <><BalanceChart monthly={result.monthly} /><YearlyChart yearly={result.yearly} /></>}
      </section>
    </form>
  );
}

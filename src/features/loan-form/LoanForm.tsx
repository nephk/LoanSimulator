import { useEffect, useState } from 'react';
import { simulate } from '../../amortization.js';
import { Button } from '../../components/dads/Button';
import { ErrorText } from '../../components/dads/ErrorText';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { Legend } from '../../components/dads/Legend';
import { NotificationBanner, NotificationBannerBody } from '../../components/dads/NotificationBanner';
import { SupportText } from '../../components/dads/SupportText';
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
      <div className='loan-form__top grid gap-6 items-start'>
        <section className='rounded-8 border border-solid-gray-300 p-6 bg-white shadow-sm' aria-labelledby='loan-overview-title'>
          <h2 id='loan-overview-title' className='mb-2 text-std-20B-150 text-solid-gray-900 flex items-center gap-2'>
            <span className='inline-flex items-center justify-center size-7 rounded-full bg-key-900 text-white text-sm font-bold'>1</span>
            全体共通の基本設定
          </h2>
          <SupportText className='mb-6 text-sm text-solid-gray-600'>
            ローン契約の骨格を決定する共通パラメータです。借入年数や金利タイプを設定します。
          </SupportText>
          <div className='grid gap-6 border-t border-solid-gray-200 pt-6'>
            <LoanTypeField loanType={loanType} onChange={setLoanType} />
            <TermYearsField value={termYears} onChange={setTermYears} />
            <RateSegmentEditor termYears={Number(termYears)} segments={rateSegments} onChange={setRateSegments} />
            <BonusFields bonus={bonus} onChange={setBonus} embedded />
          </div>
        </section>
        <div className='grid gap-6'>
          <div className='rounded-8 border border-solid-gray-300 p-6 bg-white shadow-sm'>
            <h2 className='text-std-20B-150 text-solid-gray-900 flex items-center gap-2 mb-2'>
              <span className='inline-flex items-center justify-center size-7 rounded-full bg-key-900 text-white text-sm font-bold'>2</span>
              借入人の個別条件
            </h2>
            <SupportText className='text-sm text-solid-gray-600'>
              ご契約者ごとの借入希望額および返済方式を個別にカスタマイズできます。
            </SupportText>
          </div>
          <BorrowerSection key={`primary-${resetKey}`} borrowerKey='primary' borrower={primary} onChange={setPrimary} />
          {loanType === 'pair' && <BorrowerSection key={`secondary-${resetKey}`} borrowerKey='secondary' borrower={secondary} onChange={setSecondary} />}
        </div>
      </div>
      <div className='flex flex-wrap gap-3 my-2'>
        <Button id='reset-button' size='md' variant='outline' type='button' onClick={reset} className='hover:bg-solid-gray-100 transition-colors duration-150'>
          条件を初期設定にリセット
        </Button>
      </div>
      {error && <div id='form-error' role='alert' className='my-2'><NotificationBanner bannerStyle='standard' type='error' title='入力エラー' headingLevel='h2'><NotificationBannerBody><ErrorText>{error}</ErrorText></NotificationBannerBody></NotificationBanner></div>}
      <section className='rounded-8 border border-solid-gray-300 p-6 bg-white shadow-sm' aria-labelledby='result-title'>
        <h2 id='result-title' className='mb-2 text-std-20B-150 text-solid-gray-900 flex items-center gap-2'>
          <span className='inline-flex items-center justify-center size-7 rounded-full bg-key-900 text-white text-sm font-bold'>3</span>
          シミュレーション分析レポート
        </h2>
        <SupportText className='mb-6 text-sm text-solid-gray-600 border-b border-solid-gray-200 pb-4'>
          ご入力いただいた借入条件から算出された詳細な返済総額、元利構成比、および完済までの金利変動と月々返済額の推移レポートです。
        </SupportText>
        <ResultSummary result={result} />
        {result && (
          <div className='mt-8 grid gap-8 border-t border-solid-gray-200 pt-8'>
            <div className='grid gap-6 lg:grid-cols-2'>
              <div className='bg-solid-gray-50 p-4 rounded-8 border border-solid-gray-200'>
                <h4 className='text-sm font-bold text-solid-gray-800 mb-3 flex items-center gap-1.5'>
                  <span className='w-1.5 h-4 bg-key-900 rounded-2'></span>
                  返済残高と支払額の推移（月次）
                </h4>
                <BalanceChart monthly={result.monthly} />
              </div>
              <div className='bg-solid-gray-50 p-4 rounded-8 border border-solid-gray-200'>
                <h4 className='text-sm font-bold text-solid-gray-800 mb-3 flex items-center gap-1.5'>
                  <span className='w-1.5 h-4 bg-key-900 rounded-2'></span>
                  年間返済額の内訳（年次）
                </h4>
                <YearlyChart yearly={result.yearly} />
              </div>
            </div>
          </div>
        )}
      </section>
    </form>
  );
}

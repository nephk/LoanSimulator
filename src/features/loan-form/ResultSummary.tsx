import type { SimulationResult } from './types';

function formatMonthPeriod(monthIndex: number) {
  return `${Math.floor((monthIndex - 1) / 12)}年${((monthIndex - 1) % 12) + 1}ヶ月目`;
}

export function ResultSummary({ result }: { result: SimulationResult | null }) {
  const dash = '―';
  const payments = result?.monthly.map((record) => record.payment) ?? [];
  const max = payments.length ? Math.max(...payments) : null;
  const min = payments.length ? Math.min(...payments) : null;
  const maxRecord = result?.monthly.find((record) => record.payment === max);
  const minRecord = result?.monthly.find((record) => record.payment === min);
  const value = (number: number | null | undefined) => number === null || number === undefined ? dash : number.toLocaleString('ja-JP');
  return (
    <>
      <p>総返済額: <span id='summary-total-payment'>{value(result?.totalPayment)}</span>円</p>
      <p>月々返済額（初回）: <span id='summary-first-month-payment'>{value(result?.monthly[0]?.payment)}</span>円（<span id='summary-first-month-period'>{result ? formatMonthPeriod(result.monthly[0].monthIndex) : dash}</span>）</p>
      <p>月々返済額（最大）: <span id='summary-max-payment'>{value(max)}</span>円（<span id='summary-max-period'>{maxRecord ? formatMonthPeriod(maxRecord.monthIndex) : dash}</span>）</p>
      <p>月々返済額（最小）: <span id='summary-min-payment'>{value(min)}</span>円（<span id='summary-min-period'>{minRecord ? formatMonthPeriod(minRecord.monthIndex) : dash}</span>）</p>
    </>
  );
}

import type { SimulationResult } from './types';

function formatMonthPeriod(monthIndex: number) {
  const years = Math.floor((monthIndex - 1) / 12);
  const months = ((monthIndex - 1) % 12) + 1;
  return `${years}年 ${months}ヶ月目`;
}

export function ResultSummary({ result }: { result: SimulationResult | null }) {
  const dash = '―';
  
  if (!result) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center bg-solid-gray-50 rounded-8 border border-dashed border-solid-gray-300'>
        <span className='inline-flex items-center justify-center size-12 rounded-full bg-solid-gray-200 text-solid-gray-500 mb-3 text-lg font-bold'>
          !
        </span>
        <p className='text-std-16B-150 text-solid-gray-800 font-bold mb-1'>借入条件を入力してください</p>
        <p className='text-xs text-solid-gray-500 max-w-sm'>
          左側の基本設定と、右側の借入人の個別条件を入力すると、自動的に高精度なシミュレーション結果が算出されます。
        </p>
      </div>
    );
  }

  const payments = result.monthly.map((record) => record.payment) ?? [];
  const max = payments.length ? Math.max(...payments) : 0;
  const min = payments.length ? Math.min(...payments) : 0;
  const maxRecord = result.monthly.find((record) => record.payment === max);
  const minRecord = result.monthly.find((record) => record.payment === min);
  
  const totalPrincipal = result.monthly.reduce((sum, r) => sum + r.principalPaid, 0);
  const totalInterest = Math.max(0, result.totalPayment - totalPrincipal);
  const principalPercent = result.totalPayment > 0 ? (totalPrincipal / result.totalPayment) * 100 : 0;
  const interestPercent = result.totalPayment > 0 ? (totalInterest / result.totalPayment) * 100 : 0;

  const value = (number: number | null | undefined) => number === null || number === undefined ? dash : number.toLocaleString('ja-JP');

  return (
    <div className='grid gap-6'>
      {/* Hero Card: Total Repayment Amount */}
      <div className='bg-gradient-to-br from-key-900 via-key-950 to-blue-950 text-white p-6 rounded-8 border border-solid-gray-300 shadow-md relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-20 -translate-y-20 blur-2xl pointer-events-none' />
        <span className='text-xs font-semibold tracking-wider text-key-100 bg-white/10 px-2.5 py-1 rounded-4 inline-block mb-3 uppercase'>
          Total Repayment Report
        </span>
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-5'>
          <h3 className='text-sm font-medium text-key-100'>総返済額（元金＋利息の合計）</h3>
          <div className='w-full flex items-baseline gap-x-1.5 mt-1'>
            <span id='summary-total-payment' className='text-3xl font-extrabold tracking-tight sm:text-4xl leading-none text-white'>
              {value(result.totalPayment)}
            </span>
            <span className='text-lg font-bold text-key-100'>円</span>
          </div>
        </div>

        {/* Custom Progress Bar Chart (Principal vs Interest) */}
        <div className='border-t border-white/10 pt-4 mt-2'>
          <div className='flex items-center justify-between text-xs font-semibold mb-2'>
            <span className='flex items-center gap-1.5 text-blue-200'>
              <span className='size-2.5 bg-blue-400 rounded-full inline-block' />
              元金総額: {value(totalPrincipal)}円 ({principalPercent.toFixed(1)}%)
            </span>
            <span className='flex items-center gap-1.5 text-orange-200'>
              <span className='size-2.5 bg-orange-400 rounded-full inline-block' />
              利息総額: {value(totalInterest)}円 ({interestPercent.toFixed(1)}%)
            </span>
          </div>
          <div className='w-full h-3 bg-white/10 rounded-full overflow-hidden flex' role='img' aria-label={`元金割合 ${principalPercent.toFixed(0)}%、利息割合 ${interestPercent.toFixed(0)}%`}>
            <div
              style={{ width: `${principalPercent}%` }}
              className='h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300'
            />
            <div
              style={{ width: `${interestPercent}%` }}
              className='h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300'
            />
          </div>
        </div>
      </div>

      {/* Grid Cards: Monthly Payments Breakdown */}
      <div className='grid gap-4 sm:grid-cols-3'>
        {/* Box 1: First Month */}
        <div className='bg-solid-gray-50 border border-solid-gray-200 p-4 rounded-8 hover:bg-solid-gray-100/50 transition-colors duration-150'>
          <span className='text-xs font-semibold text-solid-gray-500 block mb-1'>月々返済額（初回）</span>
          <div className='flex items-baseline gap-x-1 mb-2'>
            <span id='summary-first-month-payment' className='text-xl font-bold tracking-tight text-solid-gray-900'>
              {value(result.monthly[0]?.payment)}
            </span>
            <span className='text-xs font-semibold text-solid-gray-700'>円</span>
          </div>
          <span id='summary-first-month-period' className='text-[10px] font-semibold text-solid-gray-400 bg-solid-gray-200/60 px-2 py-0.5 rounded-4 inline-block'>
            {formatMonthPeriod(result.monthly[0]?.monthIndex ?? 1)}
          </span>
        </div>

        {/* Box 2: Maximum Month */}
        <div className='bg-solid-gray-50 border border-solid-gray-200 p-4 rounded-8 hover:bg-solid-gray-100/50 transition-colors duration-150'>
          <span className='text-xs font-semibold text-solid-gray-500 block mb-1'>月々返済額（最大）</span>
          <div className='flex items-baseline gap-x-1 mb-2'>
            <span id='summary-max-payment' className='text-xl font-bold tracking-tight text-solid-gray-900'>
              {value(max)}
            </span>
            <span className='text-xs font-semibold text-solid-gray-700'>円</span>
          </div>
          <span id='summary-max-period' className='text-[10px] font-semibold text-solid-gray-400 bg-solid-gray-200/60 px-2 py-0.5 rounded-4 inline-block'>
            {maxRecord ? formatMonthPeriod(maxRecord.monthIndex) : dash}
          </span>
        </div>

        {/* Box 3: Minimum Month */}
        <div className='bg-solid-gray-50 border border-solid-gray-200 p-4 rounded-8 hover:bg-solid-gray-100/50 transition-colors duration-150'>
          <span className='text-xs font-semibold text-solid-gray-500 block mb-1'>月々返済額（最小）</span>
          <div className='flex items-baseline gap-x-1 mb-2'>
            <span id='summary-min-payment' className='text-xl font-bold tracking-tight text-solid-gray-900'>
              {value(min)}
            </span>
            <span className='text-xs font-semibold text-solid-gray-700'>円</span>
          </div>
          <span id='summary-min-period' className='text-[10px] font-semibold text-solid-gray-400 bg-solid-gray-200/60 px-2 py-0.5 rounded-4 inline-block'>
            {minRecord ? formatMonthPeriod(minRecord.monthIndex) : dash}
          </span>
        </div>
      </div>

      <p className='text-[11px] text-solid-gray-400 leading-normal mt-1'>
        ※本試算は実質年利に基づく概算値です。実際の金利情勢、金融機関の手数料、保証料、保証協会への支払、および日割り計算方法によって異なる場合があります。
      </p>
    </div>
  );
}

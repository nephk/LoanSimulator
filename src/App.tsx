import { LoanForm } from './features/loan-form/LoanForm';

export function App() {
  return (
    <main className='mx-auto w-[min(calc(100%-2rem),80rem)] py-12 lg:w-[min(calc(100%-4rem),80rem)] lg:py-16'>
      <header className='mb-12 border-b border-solid-gray-200 pb-8'>
        <div className='flex items-center gap-x-2 mb-2'>
          <span className='px-2.5 py-0.5 text-xs font-semibold tracking-wider text-key-900 bg-key-100 rounded-full uppercase'>
            Digital Design System
          </span>
          <span className='text-xs font-medium text-solid-gray-500'>
            v1.2
          </span>
        </div>
        <h1 className='mb-4 text-std-36B-140 text-solid-gray-900 tracking-tight lg:text-5xl lg:font-bold lg:leading-tight'>
          Smart Loan Simulator <span className='text-std-24N-150 text-solid-gray-500 block sm:inline sm:ml-2 sm:text-std-28B-150 font-normal'>— 住宅ローン返済シミュレーター</span>
        </h1>
        <p className='text-std-17N-170 text-solid-gray-800 max-w-4xl leading-relaxed'>
          未来の暮らしを、確実な数字から描き出す。
          本シミュレーターは、デジタル庁デザインシステム（DADS）の規約に完全準拠し、美しさと操作性を極限まで高めた返済計画構築ツールです。
          金利の段階変化、ペアローンの個別試算、ボーナス併用など、あなたの理想に合わせた多彩なシナリオをリアルタイムにビジュアル化します。
        </p>
      </header>
      <LoanForm />
      <footer className='mt-16 border-t border-solid-gray-200 pt-6 text-center text-xs text-solid-gray-500 flex flex-col items-center gap-y-2'>
        <p className='text-std-14N-150 text-solid-gray-400'>Smart Loan Simulator | Powered by DADS Components</p>
        <a href='/LICENSE.txt' className='text-key-900 underline hover:text-key-1100'>ライセンス情報</a>
      </footer>
    </main>
  );
}

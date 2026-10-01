import { LoanForm } from './features/loan-form/LoanForm';

export function App() {
  return (
    <main className='mx-auto w-[min(calc(100%-2rem),80rem)] py-8 lg:w-[min(calc(100%-4rem),80rem)]'>
      <header className='mb-8'>
        <h1 className='mb-3 text-std-36B-140 text-solid-gray-900'>住宅ローン返済シミュレーター</h1>
        <p className='text-std-16N-170 text-solid-gray-800'>借入条件を入力すると、返済スケジュールを自動計算します。</p>
      </header>
      <LoanForm />
      <footer className='mt-12 border-t border-solid-gray-200 pt-4 text-center text-xs text-solid-gray-500'>
        <a href='/LICENSE.txt'>ライセンス情報</a>
      </footer>
    </main>
  );
}

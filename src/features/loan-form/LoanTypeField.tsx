import { Radio } from '../../components/dads/Radio';
import { SupportText } from '../../components/dads/SupportText';
import type { LoanType } from './types';

export function LoanTypeField({ loanType, onChange }: { loanType: LoanType; onChange: (loanType: LoanType) => void }) {
  return (
    <fieldset className='grid gap-2 border-b border-solid-gray-100 pb-5'>
      <legend className='text-std-17B-170 text-solid-gray-800 font-bold'>ローン形式の選択</legend>
      <SupportText className='text-xs text-solid-gray-500 leading-normal'>
        お一人で一括して借入を行う「単身ローン」、または夫婦やパートナーがそれぞれ別契約を結び共同で返済する「ペアローン」を選択してください。
      </SupportText>
      <div className='flex flex-col gap-y-1 sm:flex-row sm:flex-wrap sm:gap-x-8 mt-2'>
        <Radio name='loanType' size='md' value='single' checked={loanType === 'single'} onChange={() => onChange('single')}>
          <span className='font-semibold text-solid-gray-900'>単身ローン</span>
          <span className='block text-xs text-solid-gray-500 font-normal mt-0.5'>一人の収入をベースにした最も一般的なローン形態</span>
        </Radio>
        <Radio name='loanType' size='md' value='pair' checked={loanType === 'pair'} onChange={() => onChange('pair')}>
          <span className='font-semibold text-solid-gray-900'>ペアローン</span>
          <span className='block text-xs text-solid-gray-500 font-normal mt-0.5'>二人でそれぞれの持分と責任でローンを組む形態</span>
        </Radio>
      </div>
    </fieldset>
  );
}

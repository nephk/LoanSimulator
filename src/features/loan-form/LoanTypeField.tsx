import { Radio } from '../../components/dads/Radio';
import type { LoanType } from './types';

export function LoanTypeField({ loanType, onChange }: { loanType: LoanType; onChange: (loanType: LoanType) => void }) {
  return (
    <fieldset>
      <legend className='mb-2 text-std-17B-170 text-solid-gray-800'>ローン形式</legend>
      <div className='flex flex-wrap gap-x-6'>
        <Radio name='loanType' value='single' checked={loanType === 'single'} onChange={() => onChange('single')}>単身ローン</Radio>
        <Radio name='loanType' value='pair' checked={loanType === 'pair'} onChange={() => onChange('pair')}>ペアローン <span className='text-sm font-normal text-solid-gray-600'>夫婦などが別々に借り入れ、それぞれ返済する方式</span></Radio>
      </div>
    </fieldset>
  );
}

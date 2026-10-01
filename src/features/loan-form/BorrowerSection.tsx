import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { Radio } from '../../components/dads/Radio';
import type { BorrowerInput, RepaymentType } from './types';
import { usePrincipalInput } from './usePrincipalInput';

export function BorrowerSection({ borrower, borrowerKey, onChange }: { borrower: BorrowerInput; borrowerKey: 'primary' | 'secondary'; onChange: (borrower: BorrowerInput) => void }) {
  const principal = usePrincipalInput(borrower.principal);
  const updatePrincipal = (value: string) => {
    principal.onChange(value);
    onChange({ ...borrower, principal: Number(value.replace(/,/g, '')) });
  };
  const updateRepayment = (repaymentType: RepaymentType) => onChange({ ...borrower, repaymentType });
  const prefix = borrowerKey === 'primary' ? 'primary' : 'secondary';

  return (
    <section className='rounded-8 border border-solid-gray-300 p-6' data-borrower={borrowerKey} aria-labelledby={`${prefix}-title`}>
      <h2 id={`${prefix}-title`} className='mb-5 text-std-20B-150 text-solid-gray-900'>{borrowerKey === 'primary' ? '本人の借入条件' : '連帯債務者の借入条件'}</h2>
      <div className='grid gap-5'>
        <div>
          <Label htmlFor={`${prefix}-principal`} size='md' className='mb-2 block'>借入金額（円）</Label>
          <Input id={`${prefix}-principal`} type='text' inputMode='numeric' blockSize='md' data-field='principal' value={principal.value} onChange={(event) => updatePrincipal(event.target.value)} onFocus={principal.onFocus} onBlur={principal.onBlur} />
        </div>
        <fieldset>
          <legend className='mb-2 text-std-17B-170 text-solid-gray-800'>返済方式</legend>
          <div className='flex flex-wrap gap-x-6'>
            <Radio name={`${prefix}-repaymentType`} value='equalPayment' checked={borrower.repaymentType === 'equalPayment'} onChange={() => updateRepayment('equalPayment')}>元利均等 <span className='text-sm font-normal text-solid-gray-600'>毎月の返済額が一定</span></Radio>
            <Radio name={`${prefix}-repaymentType`} value='equalPrincipal' checked={borrower.repaymentType === 'equalPrincipal'} onChange={() => updateRepayment('equalPrincipal')}>元金均等 <span className='text-sm font-normal text-solid-gray-600'>毎月の元金部分が一定（返済額は徐々に減る）</span></Radio>
          </div>
        </fieldset>
      </div>
    </section>
  );
}

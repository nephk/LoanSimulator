import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { Radio } from '../../components/dads/Radio';
import { SupportText } from '../../components/dads/SupportText';
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
    <section className='rounded-8 border border-solid-gray-300 p-6 bg-white shadow-sm' data-borrower={borrowerKey} aria-labelledby={`${prefix}-title`}>
      <h3 id={`${prefix}-title`} className='text-std-17B-170 text-solid-gray-900 font-bold mb-1'>
        {borrowerKey === 'primary' ? '主債務者（本人）の借入条件' : '連帯債務者（パートナー等）の借入条件'}
      </h3>
      <SupportText className='text-xs text-solid-gray-500 leading-normal mb-4'>
        {borrowerKey === 'primary'
          ? 'ローン契約の中心となる方の借入希望額と、月々の返済に適用する返済方式を設定します。'
          : '共同借入を行うもう一方の方の借入希望額と、返済方式を個別に設定します。'}
      </SupportText>

      <div className='grid gap-5 border-t border-solid-gray-100 pt-4'>
        <div>
          <Label htmlFor={`${prefix}-principal`} size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
            借入希望金額
          </Label>
          <SupportText className='text-[11px] text-solid-gray-400 mb-1.5 leading-normal'>
            ※半角数字のみで入力してください。フォーカスを外すとカンマ区切りに自動整形されます。
          </SupportText>
          <div className='flex items-center gap-x-3'>
            <Input
              id={`${prefix}-principal`}
              type='text'
              inputMode='numeric'
              blockSize='md'
              data-field='principal'
              value={principal.value}
              onChange={(event) => updatePrincipal(event.target.value)}
              onFocus={principal.onFocus}
              onBlur={principal.onBlur}
              className='w-64 font-bold text-lg text-right'
            />
            <span className='text-std-16B-150 text-solid-gray-800 font-bold'>円</span>
          </div>
        </div>

        <fieldset className='grid gap-2 border-t border-solid-gray-100 pt-4'>
          <legend className='text-xs text-solid-gray-700 font-semibold mb-1.5'>
            返済元金・金利の支払方式
          </legend>
          <div className='flex flex-col gap-y-3 sm:flex-row sm:gap-x-6'>
            <div className='flex-1 border border-solid-gray-200 hover:border-key-900 p-4 rounded-8 bg-solid-gray-50/50 hover:bg-white transition-all duration-150'>
              <Radio name={`${prefix}-repaymentType`} size='md' value='equalPayment' checked={borrower.repaymentType === 'equalPayment'} onChange={() => updateRepayment('equalPayment')}>
                <span className='font-semibold text-solid-gray-900 text-sm'>元利均等返済</span>
                <span className='block text-xs text-solid-gray-500 font-normal mt-1 leading-normal'>
                  毎月の返済額（元金＋利息）が一定になる返済方法。返済初期は利息割合が高くなりますが、将来の家計管理・生活設計が非常に立てやすい特徴があります。
                </span>
              </Radio>
            </div>
            <div className='flex-1 border border-solid-gray-200 hover:border-key-900 p-4 rounded-8 bg-solid-gray-50/50 hover:bg-white transition-all duration-150'>
              <Radio name={`${prefix}-repaymentType`} size='md' value='equalPrincipal' checked={borrower.repaymentType === 'equalPrincipal'} onChange={() => updateRepayment('equalPrincipal')}>
                <span className='font-semibold text-solid-gray-900 text-sm'>元金均等返済</span>
                <span className='block text-xs text-solid-gray-500 font-normal mt-1 leading-normal'>
                  毎月返済する元金を同額にする返済方法。初期は利息支払いが多く返済金額が高くなりますが、残高の減少とともに返済額が徐々に減るため、総支払利息を最も抑えられます。
                </span>
              </Radio>
            </div>
          </div>
        </fieldset>
      </div>
    </section>
  );
}

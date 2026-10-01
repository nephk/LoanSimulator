import { Checkbox } from '../../components/dads/Checkbox';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { SupportText } from '../../components/dads/SupportText';
import type { BonusPayment } from './types';

export function BonusFields({ bonus, onChange, embedded = false }: { bonus: BonusPayment; onChange: (bonus: BonusPayment) => void; embedded?: boolean }) {
  const content = (
    <div className='grid gap-2'>
      <h3 id='bonus-title' className='text-std-17B-170 text-solid-gray-800 font-bold'>ボーナス併用返済（任意）</h3>
      <SupportText className='text-xs text-solid-gray-500 leading-normal mb-2'>
        毎月の支払いに加えて、年2回のボーナス支給月に増額して返済する「ボーナス併用」を設定できます。月々返済の負担配分を調整する際に効果的です。
      </SupportText>
      
      <div className='my-1'>
        <Checkbox id='bonus-enabled' size='md' checked={bonus.enabled} onChange={(event) => onChange({ ...bonus, enabled: event.target.checked })}>
          <span className='font-semibold text-solid-gray-900 text-sm'>ボーナス併用返済を適用する</span>
        </Checkbox>
      </div>

      {bonus.enabled && (
        <div id='bonus-fields' className='mt-3 grid gap-4 md:grid-cols-3 bg-solid-gray-50 p-4 rounded-8 border border-solid-gray-200'>
          <div>
            <Label htmlFor='bonus-amount' size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
              ボーナス時加算額（1回あたり）
            </Label>
            <div className='flex items-center gap-x-1.5'>
              <Input
                id='bonus-amount'
                type='number'
                blockSize='sm'
                min={0}
                step={10000}
                value={bonus.amountPerPayment || ''}
                onChange={(event) => onChange({ ...bonus, amountPerPayment: Number(event.target.value) })}
                className='w-full text-right font-medium'
              />
              <span className='text-xs font-semibold text-solid-gray-800 shrink-0'>円</span>
            </div>
          </div>
          <div>
            <Label htmlFor='bonus-month-1' size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
              加算返済月（1回目）
            </Label>
            <div className='flex items-center gap-x-1.5'>
              <Input
                id='bonus-month-1'
                type='number'
                blockSize='sm'
                min={1}
                max={12}
                step={1}
                value={bonus.months[0]}
                onChange={(event) => onChange({ ...bonus, months: [Number(event.target.value), bonus.months[1]] })}
                className='w-full text-right font-medium'
              />
              <span className='text-xs font-semibold text-solid-gray-800 shrink-0'>月</span>
            </div>
          </div>
          <div>
            <Label htmlFor='bonus-month-2' size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
              加算返済月（2回目）
            </Label>
            <div className='flex items-center gap-x-1.5'>
              <Input
                id='bonus-month-2'
                type='number'
                blockSize='sm'
                min={1}
                max={12}
                step={1}
                value={bonus.months[1]}
                onChange={(event) => onChange({ ...bonus, months: [bonus.months[0], Number(event.target.value)] })}
                className='w-full text-right font-medium'
              />
              <span className='text-xs font-semibold text-solid-gray-800 shrink-0'>月</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return embedded ? (
    <div className='border-t border-solid-gray-300 pt-5' aria-labelledby='bonus-title'>{content}</div>
  ) : (
    <section className='rounded-8 border border-solid-gray-300 p-6 bg-white shadow-sm' aria-labelledby='bonus-title'>{content}</section>
  );
}

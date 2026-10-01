import { Checkbox } from '../../components/dads/Checkbox';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import type { BonusPayment } from './types';

export function BonusFields({ bonus, onChange, embedded = false }: { bonus: BonusPayment; onChange: (bonus: BonusPayment) => void; embedded?: boolean }) {
  const content = (
    <>
      <h2 id='bonus-title' className='mb-5 text-std-20B-150 text-solid-gray-900'>ボーナス返済</h2>
      <Checkbox id='bonus-enabled' size='md' checked={bonus.enabled} onChange={(event) => onChange({ ...bonus, enabled: event.target.checked })}>ボーナス返済を行う</Checkbox>
      {bonus.enabled && <div id='bonus-fields' className='mt-3 grid gap-5 md:grid-cols-3'>
        <div><Label htmlFor='bonus-amount' size='md' className='mb-2 block'>加算額（1回あたり・円）</Label><Input id='bonus-amount' type='number' blockSize='md' min={0} step={1} value={bonus.amountPerPayment} onChange={(event) => onChange({ ...bonus, amountPerPayment: Number(event.target.value) })} /></div>
        <div><Label htmlFor='bonus-month-1' size='md' className='mb-2 block'>返済月1</Label><Input id='bonus-month-1' type='number' blockSize='md' min={1} max={12} step={1} value={bonus.months[0]} onChange={(event) => onChange({ ...bonus, months: [Number(event.target.value), bonus.months[1]] })} /></div>
        <div><Label htmlFor='bonus-month-2' size='md' className='mb-2 block'>返済月2</Label><Input id='bonus-month-2' type='number' blockSize='md' min={1} max={12} step={1} value={bonus.months[1]} onChange={(event) => onChange({ ...bonus, months: [bonus.months[0], Number(event.target.value)] })} /></div>
      </div>}
    </>
  );

  return embedded ? (
    <div className='border-t border-solid-gray-300 pt-5' aria-labelledby='bonus-title'>{content}</div>
  ) : (
    <section className='rounded-8 border border-solid-gray-300 p-6' aria-labelledby='bonus-title'>{content}</section>
  );
}

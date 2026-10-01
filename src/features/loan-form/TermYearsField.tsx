import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { SupportText } from '../../components/dads/SupportText';

export function TermYearsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className='grid gap-2 border-b border-solid-gray-100 pb-5'>
      <Label htmlFor='term-years' size='md' className='text-std-17B-170 text-solid-gray-800 font-bold block'>
        借入期間の設定
      </Label>
      <SupportText className='text-xs text-solid-gray-500 leading-normal'>
        ご希望の借入期間を年単位（1年〜最長50年）で入力してください。長期間にするほど月々の返済額は抑えられますが、総支払利息は増加します。
      </SupportText>
      <div className='flex items-center gap-x-3 mt-1.5'>
        <Input
          id='term-years'
          type='number'
          blockSize='md'
          name='termYears'
          min={1}
          max={50}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className='w-32 text-right'
        />
        <span className='text-std-16B-150 text-solid-gray-800 font-bold'>年</span>
      </div>
    </div>
  );
}

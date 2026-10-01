import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';

export function TermYearsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div><Label htmlFor='term-years' size='md' className='mb-2 block'>借入期間（年）</Label><Input id='term-years' type='number' blockSize='md' name='termYears' min={1} step={1} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

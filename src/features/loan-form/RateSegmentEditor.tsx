import { Button } from '../../components/dads/Button';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import type { RateSegment } from './types';

function getRemainingYears(segments: RateSegment[], termYears: number) {
  const valid = Number.isInteger(termYears) && segments.every((segment) => Number.isInteger(segment.years) && segment.years > 0);
  if (!valid) return null;
  return termYears - segments.reduce((sum, segment) => sum + segment.years, 0);
}

export function RateSegmentEditor({ termYears, segments, onChange }: { termYears: number; segments: RateSegment[]; onChange: (segments: RateSegment[]) => void }) {
  const remainingYears = getRemainingYears(segments, termYears);
  const update = (index: number, field: keyof RateSegment, value: string) => {
    const next = segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, [field]: Number(value) } : segment);
    onChange(next);
  };
  const add = () => {
    if (remainingYears === null || remainingYears <= 0) return;
    const rate = segments.at(-1)?.annualRatePercent ?? 1;
    onChange([...segments, { years: remainingYears, annualRatePercent: rate }]);
  };
  const remove = (index: number) => {
    if (segments.length <= 1) return;
    onChange(segments.filter((_, segmentIndex) => segmentIndex !== index));
  };

  return (
    <div className='rate-segment-editor' role='group' aria-labelledby='rate-segment-heading'>
      <h3 id='rate-segment-heading' className='mb-5 text-std-20B-150 text-solid-gray-900'>金利区間</h3>
      <div className='grid gap-3'>
        {segments.map((segment, index) => (
          <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end gap-3' data-rate-segment key={index}>
            <div>
              <Label htmlFor={`rate-years-${index}`} size='sm' className='mb-1 block'>年数</Label>
              <Input id={`rate-years-${index}`} type='number' blockSize='md' min={1} step={1} value={segment.years} data-rate-field='years' onChange={(event) => update(index, 'years', event.target.value)} />
            </div>
            <div>
              <Label htmlFor={`rate-percent-${index}`} size='sm' className='mb-1 block'>年利（%）</Label>
              <Input id={`rate-percent-${index}`} type='number' blockSize='md' min={0} step={0.001} value={segment.annualRatePercent} data-rate-field='annualRatePercent' onChange={(event) => update(index, 'annualRatePercent', event.target.value)} />
            </div>
            <Button size='sm' variant='text' type='button' data-action='remove-segment' disabled={segments.length === 1} onClick={() => remove(index)}>削除</Button>
          </div>
        ))}
      </div>
      <div className='mt-3'>
        <Button size='sm' variant='outline' type='button' data-action='add-segment' disabled={remainingYears === null || remainingYears <= 0} onClick={add}>金利区間を追加</Button>
      </div>
    </div>
  );
}

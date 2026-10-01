import { Button } from '../../components/dads/Button';
import { Input } from '../../components/dads/Input';
import { Label } from '../../components/dads/Label';
import { SupportText } from '../../components/dads/SupportText';
import type { RateSegment } from './types';

function getRemainingYears(segments: RateSegment[], termYears: number) {
  const valid = Number.isInteger(termYears) && segments.every((segment) => Number.isInteger(segment.years) && segment.years > 0);
  if (!valid) return null;
  return termYears - segments.reduce((sum, segment) => sum + segment.years, 0);
}

export function RateSegmentEditor({ termYears, segments, onChange }: { termYears: number; segments: RateSegment[]; onChange: (segments: RateSegment[]) => void }) {
  const remainingYears = getRemainingYears(segments, termYears);
  const update = (index: number, field: keyof RateSegment, value: string) => {
    let numValue = Number(value);

    if (field === 'years' && segments.length > 1) {
      // Find sum of all other segments, excluding the current one and the last one
      const otherSegmentsSum = segments.reduce((sum, s, idx) => {
        return (idx !== index && idx !== segments.length - 1) ? sum + s.years : sum;
      }, 0);
      const maxAllowed = Math.max(1, termYears - otherSegmentsSum - 1); // at least 1 year for the last segment
      numValue = Math.max(1, Math.min(maxAllowed, numValue));
    }

    const next = segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, [field]: numValue } : segment);

    // Synchronize the last segment's years
    if (field === 'years' && next.length > 1) {
      const totalExceptLast = next.slice(0, -1).reduce((sum, s) => sum + s.years, 0);
      const lastIndex = next.length - 1;
      next[lastIndex] = { ...next[lastIndex], years: Math.max(1, termYears - totalExceptLast) };
    }

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
    <div className='rate-segment-editor grid gap-2 border-b border-solid-gray-100 pb-5' role='group' aria-labelledby='rate-segment-heading'>
      <h3 id='rate-segment-heading' className='text-std-17B-170 text-solid-gray-800 font-bold'>金利タイプと段階設定</h3>
      <SupportText className='text-xs text-solid-gray-500 leading-normal'>
        「当初10年は固定金利1.2%、その後は1.8%」のように、期間ごとの金利見直しスケジュールを設定できます。最後の金利区間の年数は、総借入期間（{termYears}年）に合うよう自動的に調整されます。
      </SupportText>
      
      <div className='grid gap-4 mt-3 bg-solid-gray-50 p-4 rounded-8 border border-solid-gray-200'>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end gap-3' data-rate-segment key={index}>
              <div className='relative'>
                <Label htmlFor={`rate-years-${index}`} size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
                  {index + 1}期目の期間
                </Label>
                <div className='flex items-center gap-x-1.5'>
                  <Input
                    id={`rate-years-${index}`}
                    type='number'
                    blockSize='sm'
                    min={1}
                    max={termYears}
                    step={1}
                    value={segment.years}
                    data-rate-field='years'
                    readOnly={isLast}
                    disabled={isLast && segments.length === 1}
                    onChange={(event) => update(index, 'years', event.target.value)}
                    className='w-full text-right font-medium'
                  />
                  <span className='text-xs font-semibold text-solid-gray-800 shrink-0'>年</span>
                </div>
              </div>
              <div>
                <Label htmlFor={`rate-percent-${index}`} size='sm' className='mb-1.5 text-xs text-solid-gray-700 block font-semibold'>
                  適用年利
                </Label>
                <div className='flex items-center gap-x-1.5'>
                  <Input
                    id={`rate-percent-${index}`}
                    type='number'
                    blockSize='sm'
                    min={0}
                    max={20}
                    step={0.001}
                    value={segment.annualRatePercent}
                    data-rate-field='annualRatePercent'
                    onChange={(event) => update(index, 'annualRatePercent', event.target.value)}
                    className='w-full text-right font-medium'
                  />
                  <span className='text-xs font-semibold text-solid-gray-800 shrink-0'>%</span>
                </div>
              </div>
              <div className='flex h-10 items-center'>
                <Button
                  size='xs'
                  variant='text'
                  type='button'
                  data-action='remove-segment'
                  disabled={segments.length === 1}
                  onClick={() => remove(index)}
                  className='text-error-1 hover:bg-red-50 px-2'
                >
                  削除
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className='mt-2 flex items-center justify-between gap-4 flex-wrap'>
        <Button
          size='sm'
          variant='outline'
          type='button'
          data-action='add-segment'
          disabled={remainingYears === null || remainingYears <= 0}
          onClick={add}
          className='hover:bg-solid-gray-100 transition-all duration-150 text-xs font-semibold'
        >
          ＋ 金利適用区間を追加する
        </Button>
        {remainingYears !== null && remainingYears > 0 && (
          <span className='text-xs text-key-900 bg-key-50 px-2.5 py-1 rounded-4 font-semibold'>
            残り可能割り当て：{remainingYears}年分
          </span>
        )}
      </div>
    </div>
  );
}

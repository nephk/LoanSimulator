import { useState } from 'react';
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
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const remainingYears = getRemainingYears(segments, termYears);
  const update = (index: number, field: keyof RateSegment, value: string) => {
    const currentValue = segments[index][field];
    let numValue = Number(value);

    // A number input can temporarily contain an empty or otherwise invalid value
    // while it is being edited. Keep the last valid value instead of propagating
    // NaN into the simulation.
    if (!Number.isFinite(numValue)) numValue = currentValue;

    if (field === 'years') {
      numValue = Math.round(numValue);
      if (segments.length > 1) {
        // Reserve at least one year for the automatically synchronized last segment.
        const otherSegmentsSum = segments.reduce((sum, segment, segmentIndex) => (
          segmentIndex !== index && segmentIndex !== segments.length - 1 ? sum + segment.years : sum
        ), 0);
        const maxAllowed = Math.max(1, termYears - otherSegmentsSum - 1);
        numValue = Math.max(1, Math.min(maxAllowed, numValue));
      } else {
        numValue = Math.max(1, Math.min(termYears, numValue));
      }
    }

    const next = segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, [field]: numValue } : segment);

    // Synchronize the last segment's years whenever a user edits a preceding one.
    if (field === 'years' && next.length > 1) {
      const totalExceptLast = next.slice(0, -1).reduce((sum, segment) => sum + segment.years, 0);
      const lastIndex = next.length - 1;
      next[lastIndex] = { ...next[lastIndex], years: Math.max(1, termYears - totalExceptLast) };
    }

    onChange(next);
  };
  const add = () => {
    if (!Number.isInteger(termYears) || termYears < 2 || remainingYears === null) return;
    setRateDrafts({});

    if (remainingYears > 0) {
      const rate = segments.at(-1)?.annualRatePercent ?? 1;
      onChange([...segments, { years: remainingYears, annualRatePercent: rate }]);
      return;
    }

    // When all years are already allocated, split the last segment that has at
    // least two years. This keeps the total unchanged and makes it possible to
    // add a third, fourth, and subsequent segment as long as there is a year to
    // split. The newly inserted segment becomes the new final auto-synced one.
    const splitIndex = [...segments].findLastIndex((segment) => segment.years >= 2);
    if (splitIndex < 0) return;
    const segment = segments[splitIndex];
    const next = [
      ...segments.slice(0, splitIndex),
      { ...segment, years: segment.years - 1 },
      { ...segment, years: 1 },
      ...segments.slice(splitIndex + 1),
    ];
    onChange(next);
  };
  const remove = (index: number) => {
    if (segments.length <= 1) return;
    setRateDrafts({});
    const next = segments.filter((_, segmentIndex) => segmentIndex !== index);
    if (next.length === 1) {
      onChange([{ ...next[0], years: termYears }]);
      return;
    }

    const totalExceptLast = next.slice(0, -1).reduce((sum, segment) => sum + segment.years, 0);
    const lastIndex = next.length - 1;
    next[lastIndex] = { ...next[lastIndex], years: Math.max(1, termYears - totalExceptLast) };
    onChange(next);
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
                    value={rateDrafts[index] ?? String(segment.annualRatePercent)}
                    data-rate-field='annualRatePercent'
                    onChange={(event) => {
                      // Keep the visible draft while typing (for example `1.`),
                      // but remove the leading zero that appears after editing
                      // the controlled zero value (`01.5`).
                      const rawValue = event.target.value;
                      const normalizedValue = rawValue.replace(/^0+(?=\d)/, '');
                      setRateDrafts((drafts) => ({ ...drafts, [index]: rawValue === '' ? '0' : normalizedValue }));
                      update(index, 'annualRatePercent', normalizedValue);
                    }}
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
          disabled={remainingYears === null || (remainingYears <= 0 && !segments.some((segment) => segment.years >= 2))}
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

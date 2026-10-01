import { useEffect, useRef } from 'react';
import { renderYearlyChart } from '../../charts';
import type { YearlyRecord } from './types';

export function YearlyChart({ yearly }: { yearly: YearlyRecord[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) renderYearlyChart(ref.current, yearly); }, [yearly]);
  return <div className='relative w-full'><canvas id='yearly-chart' aria-label='年間返済額グラフ' ref={ref} /></div>;
}

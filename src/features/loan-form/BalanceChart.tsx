import { useEffect, useRef } from 'react';
import { renderBalanceChart } from '../../charts';
import type { MonthlyRecord } from './types';

export function BalanceChart({ monthly }: { monthly: MonthlyRecord[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) renderBalanceChart(ref.current, monthly); }, [monthly]);
  return <div className='relative w-full'><canvas id='balance-chart' aria-label='借入残高推移グラフ' ref={ref} /></div>;
}

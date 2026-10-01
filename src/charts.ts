import Chart, { type ChartConfiguration } from 'chart.js/auto';

function replaceChart(canvas: HTMLCanvasElement, config: ChartConfiguration) {
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();
  return new Chart(canvas, config);
}

const systemFont = '-apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif';

const tooltipStyles = {
  backgroundColor: 'rgba(17, 24, 39, 0.95)',
  titleFont: { family: systemFont, size: 12, weight: 'bold' as const },
  bodyFont: { family: systemFont, size: 12 },
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
};

export function renderBalanceChart(canvas: HTMLCanvasElement, monthly: { monthIndex: number; balance: number; payment: number }[]) {
  return replaceChart(canvas, {
    type: 'line',
    data: {
      labels: monthly.map((record) => `${Math.floor((record.monthIndex - 1) / 12)}年 ${((record.monthIndex - 1) % 12) + 1}ヶ月目`),
      datasets: [
        { label: '借入残高', data: monthly.map((record) => record.balance), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', fill: true, pointRadius: 0, hoverRadius: 4, hitRadius: 8, tension: 0.15, borderWidth: 2 },
        { label: '月々の返済額', data: monthly.map((record) => record.payment), yAxisID: 'y1', borderColor: '#f97316', backgroundColor: '#f97316', fill: false, pointRadius: 0, hoverRadius: 4, hitRadius: 8, tension: 0.15, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { font: { family: systemFont, size: 11, weight: 'bold' }, color: '#4a5568', boxWidth: 12, padding: 15 } },
        tooltip: tooltipStyles,
      },
      scales: {
        x: {
          title: { display: true, text: '返済時期', font: { family: systemFont, size: 11, weight: 'bold' }, color: '#718096' },
          grid: { color: '#edf2f7' },
          ticks: { font: { family: systemFont, size: 10 }, color: '#718096', maxTicksLimit: 12 }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: '借入残高（円）', font: { family: systemFont, size: 11, weight: 'bold' }, color: '#718096' },
          grid: { color: '#edf2f7' },
          ticks: { font: { family: systemFont, size: 10 }, color: '#718096', callback: (value: string | number) => Number(value).toLocaleString('ja-JP') }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: { display: true, text: '月々の返済額（円）', font: { family: systemFont, size: 11, weight: 'bold' }, color: '#718096' },
          grid: { drawOnChartArea: false },
          ticks: { font: { family: systemFont, size: 10 }, color: '#718096', callback: (value: string | number) => Number(value).toLocaleString('ja-JP') }
        },
      },
    },
  });
}

export function renderYearlyChart(canvas: HTMLCanvasElement, yearly: { year: number; principalPaid: number; interestPaid: number }[]) {
  return replaceChart(canvas, {
    type: 'bar',
    data: {
      labels: yearly.map((record) => `${record.year}年目`),
      datasets: [
        { label: '元金返済分', data: yearly.map((record) => record.principalPaid), backgroundColor: '#3b82f6', stack: 'payments', borderRadius: 2 },
        { label: '利息支払分', data: yearly.map((record) => record.interestPaid), backgroundColor: '#f97316', stack: 'payments', borderRadius: 2 },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { font: { family: systemFont, size: 11, weight: 'bold' }, color: '#4a5568', boxWidth: 12, padding: 15 } },
        tooltip: tooltipStyles,
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: '返済年数', font: { family: systemFont, size: 11, weight: 'bold' }, color: '#718096' },
          grid: { color: '#edf2f7' },
          ticks: { font: { family: systemFont, size: 10 }, color: '#718096', maxTicksLimit: 15 }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: '年間合計返済額（円）', font: { family: systemFont, size: 11, weight: 'bold' }, color: '#718096' },
          grid: { color: '#edf2f7' },
          ticks: { font: { family: systemFont, size: 10 }, color: '#718096', callback: (value: string | number) => Number(value).toLocaleString('ja-JP') }
        },
      },
    },
  });
}

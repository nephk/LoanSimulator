function replaceChart(canvas, config) {
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();
  return new Chart(canvas, config);
}

/**
 * Render the outstanding loan balance over time.
 * @param {HTMLCanvasElement} canvas
 * @param {{ monthIndex: number, balance: number }[]} monthly
 */
export function renderBalanceChart(canvas, monthly) {
  return replaceChart(canvas, {
    type: 'line',
    data: {
      labels: monthly.map((record) => record.monthIndex),
      datasets: [{
        label: '借入残高（円）',
        data: monthly.map((record) => record.balance),
        borderColor: '#264af4',
        backgroundColor: 'rgba(38, 74, 244, 0.12)',
        fill: true,
        pointRadius: 0,
        tension: 0.15,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: {
          title: { display: true, text: '返済月' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: '残高（円）' },
          ticks: {
            callback: (value) => Number(value).toLocaleString('ja-JP'),
          },
        },
      },
    },
  });
}

/**
 * Render yearly principal and interest payments as a stacked bar chart.
 * @param {HTMLCanvasElement} canvas
 * @param {{ year: number, principalPaid: number, interestPaid: number }[]} yearly
 */
export function renderYearlyChart(canvas, yearly) {
  return replaceChart(canvas, {
    type: 'bar',
    data: {
      labels: yearly.map((record) => `${record.year}年目`),
      datasets: [
        {
          label: '元金',
          data: yearly.map((record) => record.principalPaid),
          backgroundColor: '#3460fb',
          stack: 'payments',
        },
        {
          label: '利息',
          data: yearly.map((record) => record.interestPaid),
          backgroundColor: '#ff8d44',
          stack: 'payments',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: '返済年' },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: '返済額（円）' },
          ticks: {
            callback: (value) => Number(value).toLocaleString('ja-JP'),
          },
        },
      },
    },
  });
}

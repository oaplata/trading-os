<template>
  <div ref="chartContainer" class="w-full h-96"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { AccountSnapshot } from '@/types';

interface Props {
  snapshots: AccountSnapshot[];
  currency: string;
}

const props = defineProps<Props>();

const chartContainer = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: props.currency === 'COP' ? 0 : 2,
    maximumFractionDigits: props.currency === 'COP' ? 0 : 2,
  }).format(value);
};

const initChart = () => {
  if (!chartContainer.value) return;

  chartInstance = echarts.init(chartContainer.value, 'dark');

  updateChart();
};

const updateChart = () => {
  if (!chartInstance || !props.snapshots.length) {
    return;
  }

  // Ordenar snapshots por fecha
  const sortedSnapshots = [...props.snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dates = sortedSnapshots.map((s) => {
    const date = new Date(s.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const equityData = sortedSnapshots.map((s) => Number(s.equity));
  const drawdownData = sortedSnapshots.map((s) => Number(s.drawdown));

  // Calcular área de drawdown (equity + drawdown porcentual)
  const drawdownAreaData = equityData.map((equity, index) => {
    const dd = drawdownData[index];
    return equity + (equity * dd) / 100;
  });

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        const data = Array.isArray(params) ? params[0] : params;
        const index = data.dataIndex;
        const snapshot = sortedSnapshots[index];
        const date = new Date(snapshot.date).toLocaleDateString('es-CO');
        return `
          <div class="text-sm">
            <div class="font-bold mb-2">${date}</div>
            <div>Equity: <span class="font-mono">${formatCurrency(snapshot.equity)}</span></div>
            <div>Balance: <span class="font-mono">${formatCurrency(snapshot.balance)}</span></div>
            <div>Drawdown: <span class="font-mono">${snapshot.drawdown.toFixed(2)}%</span></div>
          </div>
        `;
      },
    },
    legend: {
      data: ['Equity', 'Drawdown Area'],
      textStyle: {
        color: '#a3a3a3',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#404040',
        },
      },
      axisLabel: {
        color: '#a3a3a3',
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#404040',
        },
      },
      axisLabel: {
        color: '#a3a3a3',
        formatter: (value: number) => {
          return formatCurrency(value);
        },
      },
      splitLine: {
        lineStyle: {
          color: '#262626',
        },
      },
    },
    series: [
      {
        name: 'Equity',
        type: 'line',
        data: equityData,
        smooth: true,
        lineStyle: {
          color: '#3b82f6',
          width: 2,
        },
        itemStyle: {
          color: '#3b82f6',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(59, 130, 246, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(59, 130, 246, 0.05)',
              },
            ],
          },
        },
      },
      {
        name: 'Drawdown Area',
        type: 'line',
        data: drawdownAreaData,
        lineStyle: {
          width: 0,
        },
        itemStyle: {
          color: 'transparent',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(239, 68, 68, 0.2)',
              },
              {
                offset: 1,
                color: 'rgba(239, 68, 68, 0.05)',
              },
            ],
          },
        },
        stack: 'drawdown',
      },
    ],
  };

  chartInstance.setOption(option);
};

watch(
  () => props.snapshots,
  () => {
    updateChart();
  },
  { deep: true }
);

onMounted(() => {
  initChart();
  window.addEventListener('resize', () => {
    chartInstance?.resize();
  });
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', () => {
    chartInstance?.resize();
  });
});
</script>


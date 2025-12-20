<template>
  <span :class="currencyClasses">
    {{ formattedValue }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: number;
  currency: string;
  showSign?: boolean;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
}

const props = withDefaults(defineProps<Props>(), {
  showSign: false,
  variant: 'default',
});

const formattedValue = computed(() => {
  const decimals = props.currency === 'COP' ? 0 : 2;
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(props.value));

  if (props.showSign) {
    const sign = props.value >= 0 ? '+' : '-';
    return `${sign} ${formatted}`;
  }

  return formatted;
});

const currencyClasses = computed(() => {
  const base = 'mono-number';
  const variants = {
    default: 'text-text',
    positive: 'text-profit',
    negative: 'text-loss',
    neutral: 'text-text-secondary',
  };

  // Si variant es 'default', determinar automáticamente por el valor
  if (props.variant === 'default') {
    if (props.value > 0) return `${base} ${variants.positive}`;
    if (props.value < 0) return `${base} ${variants.negative}`;
    return `${base} ${variants.neutral}`;
  }

  return `${base} ${variants[props.variant]}`;
});
</script>


<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'sm',
});

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium rounded-full';
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  const variants = {
    default: 'bg-background-secondary text-text-secondary border border-border',
    success: 'bg-profit/20 text-profit border border-profit/30',
    warning: 'bg-neutral/20 text-neutral border border-neutral/30',
    danger: 'bg-loss/20 text-loss border border-loss/30',
    info: 'bg-info/20 text-info border border-info/30',
  };
  return `${base} ${sizes[props.size]} ${variants[props.variant]}`;
});
</script>


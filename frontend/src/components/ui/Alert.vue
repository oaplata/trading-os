<template>
  <div :class="alertClasses" role="alert">
    <div class="flex items-center">
      <slot name="icon" />
      <p class="ml-2"><slot /></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'success' | 'error' | 'warning' | 'info';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
});

const alertClasses = computed(() => {
  const base = 'p-4 rounded-md border';
  const variants = {
    success: 'bg-profit/10 border-profit/20 text-profit',
    error: 'bg-loss/10 border-loss/20 text-loss',
    warning: 'bg-neutral/10 border-neutral/20 text-neutral',
    info: 'bg-info/10 border-info/20 text-info',
  };
  return `${base} ${variants[props.variant]}`;
});
</script>


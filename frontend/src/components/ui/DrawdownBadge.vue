<template>
  <Badge :variant="badgeVariant" :size="size">
    DD: {{ formattedDrawdown }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from './Badge.vue';

interface Props {
  drawdown: number;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
});

const formattedDrawdown = computed(() => {
  return `${props.drawdown.toFixed(2)}%`;
});

const badgeVariant = computed<'default' | 'success' | 'warning' | 'danger' | 'info'>(() => {
  if (props.drawdown < 5) return 'success';
  if (props.drawdown < 15) return 'warning';
  return 'danger';
});
</script>


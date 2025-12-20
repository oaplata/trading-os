<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="mr-2">
      <LoadingSpinner size="sm" />
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  size: 'md',
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const base = 'btn-base';
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  const variants = {
    primary:
      'bg-info text-white hover:bg-info-dark focus:ring-info',
    secondary:
      'bg-background-secondary text-text border border-border hover:bg-background-tertiary focus:ring-border-light',
    danger:
      'bg-loss text-white hover:bg-loss-dark focus:ring-loss',
    ghost:
      'bg-transparent text-text hover:bg-background-secondary focus:ring-border-light',
  };
  return `${base} ${sizes[props.size]} ${variants[props.variant]}`;
});
</script>


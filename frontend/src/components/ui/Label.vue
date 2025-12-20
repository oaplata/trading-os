<template>
  <label :for="htmlFor" :class="labelClasses">
    <slot />
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  htmlFor?: string;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  required: false,
});

const labelClasses = computed(() => {
  return 'block text-sm font-medium text-text';
});
</script>


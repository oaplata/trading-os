<template>
  <select
    :value="modelValue"
    :disabled="disabled"
    :class="selectClasses"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <slot />
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string | number;
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const selectClasses = computed(() => {
  return `input-base ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
});
</script>


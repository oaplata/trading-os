<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-text mb-1">
      {{ label }}
      <span v-if="required" class="text-loss">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'input-base',
        error ? 'border-loss focus:ring-loss' : '',
        inputClass,
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <p v-if="error" class="mt-1 text-sm text-loss">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-text-secondary">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  type?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  inputClass?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  inputClass: '',
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`);
</script>


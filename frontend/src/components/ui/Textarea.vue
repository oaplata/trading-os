<template>
  <div class="w-full">
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-text mb-1">
      {{ label }}
      <span v-if="required" class="text-loss">*</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="[
        'input-base resize-y',
        error ? 'border-loss focus:ring-loss' : '',
        textareaClass,
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
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
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  textareaClass?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  rows: 4,
  textareaClass: '',
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const textareaId = computed(() => `textarea-${Math.random().toString(36).substr(2, 9)}`);
</script>


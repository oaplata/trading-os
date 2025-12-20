<template>
  <div :class="['card', cardClass]">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  cardClass?: string;
}

withDefaults(defineProps<Props>(), {
  cardClass: '',
});
</script>


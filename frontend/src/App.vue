<template>
  <AppLayout v-if="showLayout">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { RouterView } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';

const route = useRoute();
const authStore = useAuthStore();

// Mostrar layout solo en rutas autenticadas (no en login, register, etc.)
const showLayout = computed(() => {
  const publicRoutes = ['Login', 'Register', 'ForgotPassword', 'ResetPassword'];
  return authStore.isAuthenticated && !publicRoutes.includes(route.name as string);
});
</script>


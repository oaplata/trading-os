<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h1>
      
      <Alert v-if="error" variant="error" class="mb-4">
        {{ error }}
      </Alert>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <Input
          v-model="email"
          type="email"
          label="Email"
          placeholder="tu@email.com"
          required
          :error="errors.email"
        />

        <Input
          v-model="password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          required
          :error="errors.password"
        />

        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="mr-2 rounded border-border bg-background-secondary"
            />
            <span class="text-sm text-text-secondary">Recordarme</span>
          </label>
          <router-link
            to="/forgot-password"
            class="text-sm text-info hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </router-link>
        </div>

        <Button type="submit" :loading="loading" class="w-full">
          Iniciar Sesión
        </Button>

        <p class="text-center text-sm text-text-secondary">
          ¿No tienes cuenta?
          <router-link to="/register" class="text-info hover:underline">
            Regístrate
          </router-link>
        </p>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Alert from '@/components/ui/Alert.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');
const errors = ref<{ email?: string; password?: string }>({});

const handleLogin = async () => {
  error.value = '';
  errors.value = {};

  if (!email.value || !password.value) {
    if (!email.value) errors.value.email = 'El email es requerido';
    if (!password.value) errors.value.password = 'La contraseña es requerida';
    return;
  }

  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    const redirect = router.currentRoute.value.query.redirect as string;
    router.push(redirect || '/dashboard');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
};
</script>


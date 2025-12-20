<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">Recuperar Contraseña</h1>
      
      <Alert v-if="success" variant="success" class="mb-4">
        Si el email existe, se ha enviado un enlace de recuperación.
      </Alert>

      <Alert v-if="error" variant="error" class="mb-4">
        {{ error }}
      </Alert>

      <form v-if="!success" @submit.prevent="handleForgotPassword" class="space-y-4">
        <Input
          v-model="email"
          type="email"
          label="Email"
          placeholder="tu@email.com"
          required
          :error="errors.email"
        />

        <Button type="submit" :loading="loading" class="w-full">
          Enviar Enlace de Recuperación
        </Button>

        <p class="text-center text-sm text-text-secondary">
          <router-link to="/login" class="text-info hover:underline">
            Volver a iniciar sesión
          </router-link>
        </p>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Alert from '@/components/ui/Alert.vue';

const authStore = useAuthStore();

const email = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const errors = ref<{ email?: string }>({});

const handleForgotPassword = async () => {
  error.value = '';
  errors.value = {};

  if (!email.value) {
    errors.value.email = 'El email es requerido';
    return;
  }

  loading.value = true;
  try {
    await authStore.forgotPassword(email.value);
    success.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al solicitar recuperación';
  } finally {
    loading.value = false;
  }
};
</script>


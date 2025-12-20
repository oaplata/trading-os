<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">Crear Cuenta</h1>
      
      <Alert v-if="error" variant="error" class="mb-4">
        {{ error }}
      </Alert>

      <form @submit.prevent="handleRegister" class="space-y-4">
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
          hint="Mínimo 8 caracteres, una mayúscula, un número y un símbolo"
        />

        <Input
          v-model="confirmPassword"
          type="password"
          label="Confirmar Contraseña"
          placeholder="••••••••"
          required
          :error="errors.confirmPassword"
        />

        <Button type="submit" :loading="loading" class="w-full">
          Registrarse
        </Button>

        <p class="text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?
          <router-link to="/login" class="text-info hover:underline">
            Inicia sesión
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
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const errors = ref<{ email?: string; password?: string; confirmPassword?: string }>({});

const validatePassword = (pwd: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(pwd);
};

const handleRegister = async () => {
  error.value = '';
  errors.value = {};

  if (!email.value) {
    errors.value.email = 'El email es requerido';
    return;
  }

  if (!password.value) {
    errors.value.password = 'La contraseña es requerida';
    return;
  }

  if (password.value.length < 8) {
    errors.value.password = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }

  if (!validatePassword(password.value)) {
    errors.value.password =
      'La contraseña debe contener mayúscula, minúscula, número y símbolo';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Las contraseñas no coinciden';
    return;
  }

  loading.value = true;
  try {
    await authStore.register(email.value, password.value);
    router.push('/onboarding');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al registrarse';
    if (err.response?.status === 409) {
      errors.value.email = 'Este email ya está registrado';
    }
  } finally {
    loading.value = false;
  }
};
</script>


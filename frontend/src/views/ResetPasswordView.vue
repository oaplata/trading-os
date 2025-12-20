<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">Resetear Contraseña</h1>
      
      <Alert v-if="error" variant="error" class="mb-4">
        {{ error }}
      </Alert>

      <Alert v-if="success" variant="success" class="mb-4">
        Contraseña restablecida exitosamente. Redirigiendo...
      </Alert>

      <form v-if="!success" @submit.prevent="handleResetPassword" class="space-y-4">
        <Input
          v-model="password"
          type="password"
          label="Nueva Contraseña"
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
          Resetear Contraseña
        </Button>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Alert from '@/components/ui/Alert.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const errors = ref<{ password?: string; confirmPassword?: string }>({});

onMounted(() => {
  const tokenParam = route.query.token as string;
  if (!tokenParam) {
    error.value = 'Token de recuperación no válido';
  } else {
    token.value = tokenParam;
  }
});

const validatePassword = (pwd: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(pwd);
};

const handleResetPassword = async () => {
  error.value = '';
  errors.value = {};

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
    await authStore.resetPassword(token.value, password.value);
    success.value = true;
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al resetear contraseña';
  } finally {
    loading.value = false;
  }
};
</script>


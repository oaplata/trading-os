<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-2xl">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold">Configuración Inicial</h1>
        <Button
          variant="ghost"
          size="sm"
          @click="handleSkip"
          :loading="loading"
          class="text-text-secondary hover:text-text"
        >
          Omitir por ahora
        </Button>
      </div>

      <!-- Stepper -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="flex items-center flex-1"
          >
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center font-semibold',
                currentStep >= index
                  ? 'bg-info text-white'
                  : 'bg-background-secondary text-text-secondary',
              ]"
            >
              {{ index + 1 }}
            </div>
            <div
              v-if="index < steps.length - 1"
              :class="[
                'flex-1 h-1 mx-2',
                currentStep > index ? 'bg-info' : 'bg-border',
              ]"
            ></div>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="space-y-6">
        <!-- Paso 1: Zona Horaria -->
        <div v-if="currentStep === 0" class="space-y-4">
          <h2 class="text-xl font-semibold">Zona Horaria</h2>
          <Input
            v-model="formData.timezone"
            label="Selecciona tu zona horaria"
            placeholder="America/Bogota"
            hint="Usaremos esta zona para registrar las fechas de tus trades"
          />
        </div>

        <!-- Paso 2: Moneda Base -->
        <div v-if="currentStep === 1" class="space-y-4">
          <h2 class="text-xl font-semibold">Moneda Base</h2>
          <div class="space-y-2">
            <label
              v-for="currency in ['USD', 'COP']"
              :key="currency"
              class="flex items-center p-4 border border-border rounded-md cursor-pointer hover:bg-background-secondary"
            >
              <input
                v-model="formData.baseCurrency"
                type="radio"
                :value="currency"
                class="mr-3"
              />
              <span>{{ currency }}</span>
            </label>
          </div>
        </div>

        <!-- Paso 3: Primera Cuenta -->
        <div v-if="currentStep === 2" class="space-y-4">
          <h2 class="text-xl font-semibold">Crear Primera Cuenta</h2>
          <Input
            v-model="formData.accountName"
            label="Nombre de la cuenta"
            placeholder="Ej: Binance Futures"
            required
          />
          <Input
            v-model="formData.accountBroker"
            label="Broker/Exchange (opcional)"
            placeholder="Ej: Binance"
          />
          <div>
            <Label>Tipo de cuenta</Label>
            <select
              v-model="formData.accountType"
              class="input-base"
            >
              <option value="SPOT">Spot</option>
              <option value="MARGIN">Margin</option>
              <option value="FUTURES">Futures</option>
              <option value="CFD">CFD</option>
            </select>
          </div>
        </div>

        <!-- Paso 4: Riesgo por Defecto -->
        <div v-if="currentStep === 3" class="space-y-4">
          <h2 class="text-xl font-semibold">Riesgo por Defecto</h2>
          <Input
            v-model.number="formData.defaultRiskPercent"
            type="number"
            label="Riesgo % por defecto"
            placeholder="1"
            hint="Este será el riesgo por defecto al crear nuevos trades"
          />
          <label class="flex items-center">
            <input
              v-model="formData.skipRiskDefault"
              type="checkbox"
              class="mr-2"
            />
            <span class="text-sm text-text-secondary">
              No usar riesgo por defecto
            </span>
          </label>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between mt-8">
        <div class="flex gap-2">
          <Button
            v-if="currentStep > 0"
            variant="ghost"
            @click="currentStep--"
          >
            Anterior
          </Button>
          <Button
            v-if="currentStep === 0"
            variant="ghost"
            @click="handleSkip"
            :loading="loading"
            class="text-text-secondary"
          >
            Omitir
          </Button>
        </div>
        <div class="flex gap-2">
          <Button
            v-if="currentStep < steps.length - 1"
            @click="currentStep++"
          >
            Siguiente
          </Button>
          <Button
            v-else
            :loading="loading"
            @click="handleComplete"
          >
            Completar Configuración
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Label from '@/components/ui/Label.vue';

const router = useRouter();
const authStore = useAuthStore();

const currentStep = ref(0);
const loading = ref(false);
const steps = ['Zona Horaria', 'Moneda', 'Cuenta', 'Riesgo'];

const formData = ref({
  timezone: 'America/Bogota',
  baseCurrency: 'USD' as 'USD' | 'COP',
  accountName: '',
  accountBroker: '',
  accountType: 'SPOT' as 'SPOT' | 'MARGIN' | 'FUTURES' | 'CFD',
  defaultRiskPercent: 1,
  skipRiskDefault: false,
});

const handleSkip = async () => {
  loading.value = true;
  try {
    // Actualizar settings con valores por defecto y marcar onboarding como completado
    await authStore.updateSettings({
      timezone: formData.value.timezone || 'America/Bogota',
      baseCurrency: formData.value.baseCurrency || 'USD',
      onboardingCompleted: true,
    });

    // Refrescar usuario
    await authStore.fetchUser();

    router.push('/dashboard');
  } catch (error) {
    console.error('Error skipping onboarding:', error);
  } finally {
    loading.value = false;
  }
};

const handleComplete = async () => {
  loading.value = true;
  try {
    // Actualizar settings
    await authStore.updateSettings({
      timezone: formData.value.timezone,
      baseCurrency: formData.value.baseCurrency,
      defaultRiskPercent: formData.value.skipRiskDefault
        ? undefined
        : formData.value.defaultRiskPercent,
      onboardingCompleted: true,
    });

    // Crear cuenta si se proporcionó nombre
    if (formData.value.accountName) {
      await api.post('/accounts', {
        name: formData.value.accountName,
        broker: formData.value.accountBroker || undefined,
        type: formData.value.accountType,
        currency: formData.value.baseCurrency,
      });
    }

    // Refrescar usuario
    await authStore.fetchUser();

    router.push('/dashboard');
  } catch (error) {
    console.error('Error completing onboarding:', error);
  } finally {
    loading.value = false;
  }
};
</script>


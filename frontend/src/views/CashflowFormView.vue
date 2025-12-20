<template>
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a cashflows
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Cashflow' : 'Nuevo Cashflow' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Cuenta -->
          <div>
            <Label htmlFor="account">Cuenta</Label>
            <Select
              id="account"
              v-model="form.accountId"
              class="mt-1"
              required
              :disabled="isEditMode"
            >
              <option value="">Seleccionar cuenta</option>
              <option
                v-for="account in activeAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }} ({{ account.currency }})
              </option>
            </Select>
            <p v-if="errors.accountId" class="mt-1 text-sm text-loss">{{ errors.accountId }}</p>
          </div>

          <!-- Tipo -->
          <div>
            <Label>Tipo</Label>
            <div class="mt-2 grid grid-cols-2 gap-4">
              <label
                v-for="type in cashflowTypes"
                :key="type.value"
                :class="[
                  'flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors',
                  form.type === type.value
                    ? 'border-info bg-info/10'
                    : 'border-border hover:bg-background-secondary',
                ]"
              >
                <input
                  type="radio"
                  :value="type.value"
                  v-model="form.type"
                  class="text-info"
                />
                <span>{{ type.label }}</span>
              </label>
            </div>
            <p v-if="errors.type" class="mt-1 text-sm text-loss">{{ errors.type }}</p>
          </div>

          <!-- Monto y Moneda -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                v-model="form.amount"
                type="number"
                step="0.01"
                min="0.01"
                label="Monto"
                placeholder="0.00"
                required
                :error="errors.amount"
              />
            </div>
            <div>
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                v-model="form.currency"
                class="mt-1"
                readonly
                :value="selectedAccountCurrency"
              />
              <p class="mt-1 text-sm text-text-secondary">
                Moneda de la cuenta seleccionada
              </p>
            </div>
          </div>

          <!-- Fecha -->
          <div>
            <Input
              v-model="form.date"
              type="datetime-local"
              label="Fecha"
              required
              :error="errors.date"
            />
          </div>

          <!-- Descripción -->
          <div>
            <Textarea
              v-model="form.description"
              label="Descripción"
              placeholder="Descripción del movimiento..."
              :rows="3"
            />
          </div>

          <!-- Categoría -->
          <div>
            <Label htmlFor="category">Categoría</Label>
            <Select id="category" v-model="form.category" class="mt-1">
              <option value="">Sin categoría</option>
              <option value="Commission">Commission</option>
              <option value="Subscription">Subscription</option>
              <option value="Transfer">Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <!-- Preview del efecto en balance -->
          <div v-if="selectedAccount && form.amount" class="p-4 bg-background-secondary rounded-md">
            <Label>Efecto en Balance</Label>
            <div class="mt-2 space-y-1">
              <p class="text-text-secondary text-sm">
                Balance actual: {{ formatCurrency(selectedAccount.currentBalance || 0, form.currency) }}
              </p>
              <p class="text-text-secondary text-sm">
                Monto: {{ formatCurrency(Number(form.amount), form.currency) }}
                <span :class="getAmountEffectClass()">
                  ({{ getAmountEffectSign() }})
                </span>
              </p>
              <p class="text-text font-medium">
                Balance después: {{ formatCurrency(getNewBalance(), form.currency) }}
              </p>
            </div>
          </div>

          <!-- Error General -->
          <div v-if="generalError" class="p-4 bg-loss/20 border border-loss/30 rounded-md">
            <p class="text-loss text-sm">{{ generalError }}</p>
          </div>

          <!-- Botones -->
          <div class="flex justify-end gap-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" @click="handleCancel">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" :loading="loading">
              {{ isEditMode ? 'Guardar Cambios' : 'Crear Cashflow' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCashflowsStore } from '@/stores/cashflows';
import { useAccountsStore } from '@/stores/accounts';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const route = useRoute();
const router = useRouter();
const cashflowsStore = useCashflowsStore();
const accountsStore = useAccountsStore();

const isEditMode = computed(() => !!route.params.id);

const cashflowTypes = [
  { value: 'DEPOSIT', label: 'Depósito' },
  { value: 'WITHDRAWAL', label: 'Retiro' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'FEE', label: 'Fee' },
];

const form = ref({
  accountId: '',
  type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'FEE',
  amount: '',
  currency: '',
  date: new Date().toISOString().slice(0, 16),
  description: '',
  category: '',
});

const errors = ref<Record<string, string>>({});
const generalError = ref<string | null>(null);
const loading = ref(false);

const activeAccounts = computed(() =>
  accountsStore.accounts.filter((acc) => acc.status === 'ACTIVE')
);

const selectedAccount = computed(() => {
  if (!form.value.accountId) return null;
  return accountsStore.accounts.find((acc) => acc.id === form.value.accountId) || null;
});

const selectedAccountCurrency = computed(() => {
  return selectedAccount.value?.currency || form.value.currency || '';
});

// Actualizar moneda cuando se selecciona cuenta
watch(
  () => form.value.accountId,
  (newAccountId) => {
    if (newAccountId && selectedAccount.value) {
      form.value.currency = selectedAccount.value.currency;
    }
  }
);

const validateForm = (): boolean => {
  errors.value = {};

  if (!form.value.accountId) {
    errors.value.accountId = 'La cuenta es requerida';
  }

  if (!form.value.type) {
    errors.value.type = 'El tipo es requerido';
  }

  const amount = Number(form.value.amount);
  if (!form.value.amount || amount <= 0) {
    errors.value.amount = 'El monto debe ser mayor a 0';
  }

  if (!form.value.date) {
    errors.value.date = 'La fecha es requerida';
  } else {
    const selectedDate = new Date(form.value.date);
    const now = new Date();
    if (selectedDate > now) {
      errors.value.date = 'La fecha no puede ser futura';
    }
  }

  if (selectedAccount.value && form.value.currency !== selectedAccount.value.currency) {
    errors.value.currency = 'La moneda debe coincidir con la cuenta';
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  generalError.value = null;

  try {
    const data = {
      accountId: form.value.accountId,
      type: form.value.type,
      amount: Number(form.value.amount),
      currency: form.value.currency,
      description: form.value.description || undefined,
      date: new Date(form.value.date).toISOString(),
      category: form.value.category || undefined,
    };

    if (isEditMode.value) {
      await cashflowsStore.updateCashflow(route.params.id as string, data);
    } else {
      await cashflowsStore.createCashflow(data);
    }

    router.push({ name: 'Cashflows' });
  } catch (err: any) {
    generalError.value =
      err.response?.data?.message || `Error al ${isEditMode.value ? 'actualizar' : 'crear'} el cashflow`;
    console.error('Error submitting form:', err);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.push({ name: 'Cashflows' });
};

const loadCashflow = async () => {
  if (!isEditMode.value) return;

  loading.value = true;
  try {
    await cashflowsStore.fetchCashflows();
    const found = cashflowsStore.cashflows.find((cf) => cf.id === route.params.id);
    if (found) {
      form.value = {
        accountId: found.accountId,
        type: found.type,
        amount: found.amount.toString(),
        currency: found.currency,
        date: new Date(found.date).toISOString().slice(0, 16),
        description: found.description || '',
        category: found.category || '',
      };
    }
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al cargar el cashflow';
    console.error('Error loading cashflow:', err);
  } finally {
    loading.value = false;
  }
};

// Helpers
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
};

const getNewBalance = (): number => {
  if (!selectedAccount.value || !form.value.amount) return 0;
  const currentBalance = selectedAccount.value.currentBalance || 0;
  const amount = Number(form.value.amount);
  if (form.value.type === 'DEPOSIT' || form.value.type === 'ADJUSTMENT') {
    return currentBalance + amount;
  } else {
    return currentBalance - amount;
  }
};

const getAmountEffectSign = (): string => {
  if (form.value.type === 'DEPOSIT' || form.value.type === 'ADJUSTMENT') {
    return '+';
  }
  return '-';
};

const getAmountEffectClass = (): string => {
  if (form.value.type === 'DEPOSIT' || form.value.type === 'ADJUSTMENT') {
    return 'text-profit';
  }
  return 'text-loss';
};

onMounted(async () => {
  // Cargar cuentas si no están cargadas
  if (accountsStore.accounts.length === 0) {
    await accountsStore.fetchAccounts();
  }

  if (isEditMode.value) {
    await loadCashflow();
  } else {
    // Si hay un accountId en query params, usarlo
    if (route.query.accountId) {
      form.value.accountId = route.query.accountId as string;
    }
  }
});
</script>


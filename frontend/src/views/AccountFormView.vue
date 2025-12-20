<template>
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← {{ isEditMode ? 'Volver a detalle' : 'Volver a cuentas' }}
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Cuenta' : 'Nueva Cuenta' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Nombre -->
          <div>
            <Input
              v-model="form.name"
              label="Nombre"
              placeholder="Ej: Binance Futures"
              required
              :error="errors.name"
            />
          </div>

          <!-- Broker -->
          <div>
            <Input
              v-model="form.broker"
              label="Broker/Exchange"
              placeholder="Ej: Binance"
              :error="errors.broker"
            />
          </div>

          <!-- Tipo y Moneda -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" v-model="form.type" class="mt-1" required>
                <option value="">Seleccionar tipo</option>
                <option value="SPOT">Spot</option>
                <option value="MARGIN">Margin</option>
                <option value="FUTURES">Futures</option>
                <option value="CFD">CFD</option>
              </Select>
              <p v-if="errors.type" class="mt-1 text-sm text-loss">{{ errors.type }}</p>
            </div>

            <div>
              <Label htmlFor="currency">Moneda</Label>
              <Select id="currency" v-model="form.currency" class="mt-1" required>
                <option value="">Seleccionar moneda</option>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </Select>
              <p v-if="errors.currency" class="mt-1 text-sm text-loss">{{ errors.currency }}</p>
            </div>
          </div>

          <!-- Balance Inicial -->
          <div>
            <Input
              v-model="form.initialBalance"
              type="number"
              step="0.01"
              min="0"
              label="Balance Inicial"
              placeholder="0.00"
              :error="errors.initialBalance"
              hint="Opcional. Puedes establecerlo después."
            />
          </div>

          <!-- Notas -->
          <div>
            <Textarea
              v-model="form.notes"
              label="Notas"
              placeholder="Notas adicionales sobre la cuenta..."
              :rows="3"
            />
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
              {{ isEditMode ? 'Guardar Cambios' : 'Crear Cuenta' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import type { CreateAccountDto, UpdateAccountDto } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.id);

const form = ref<{
  name: string;
  broker: string;
  type: string;
  currency: string;
  initialBalance: string;
  notes: string;
}>({
  name: '',
  broker: '',
  type: 'SPOT',
  currency: authStore.user?.settings?.baseCurrency || 'USD',
  initialBalance: '',
  notes: '',
});

const errors = ref<Record<string, string>>({});
const generalError = ref<string | null>(null);
const loading = ref(false);

const validateForm = (): boolean => {
  errors.value = {};

  if (!form.value.name.trim()) {
    errors.value.name = 'El nombre es requerido';
  }

  if (!form.value.type) {
    errors.value.type = 'El tipo es requerido';
  }

  if (!form.value.currency) {
    errors.value.currency = 'La moneda es requerida';
  }

  if (form.value.initialBalance && Number(form.value.initialBalance) < 0) {
    errors.value.initialBalance = 'El balance inicial no puede ser negativo';
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
    if (isEditMode.value) {
      const updateData: UpdateAccountDto = {
        name: form.value.name,
        broker: form.value.broker || undefined,
        notes: form.value.notes || undefined,
      };
      await accountsStore.updateAccount(route.params.id as string, updateData);
      router.push({ name: 'AccountDetail', params: { id: route.params.id } });
    } else {
      const createData: CreateAccountDto = {
        name: form.value.name,
        broker: form.value.broker || undefined,
        type: form.value.type as 'SPOT' | 'MARGIN' | 'FUTURES' | 'CFD',
        currency: form.value.currency,
        initialBalance: form.value.initialBalance ? Number(form.value.initialBalance) : undefined,
        notes: form.value.notes || undefined,
      };
      const newAccount = await accountsStore.createAccount(createData);
      router.push({ name: 'AccountDetail', params: { id: newAccount.id } });
    }
  } catch (err: any) {
    generalError.value =
      err.response?.data?.message || `Error al ${isEditMode.value ? 'actualizar' : 'crear'} la cuenta`;
    console.error('Error submitting form:', err);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  if (isEditMode.value) {
    router.push({ name: 'AccountDetail', params: { id: route.params.id } });
  } else {
    router.push({ name: 'Accounts' });
  }
};

const loadAccount = async () => {
  if (!isEditMode.value) return;

  loading.value = true;
  try {
    const account = await accountsStore.fetchAccountDetails(route.params.id as string);
    form.value = {
      name: account.name,
      broker: account.broker || '',
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance ? account.initialBalance.toString() : '',
      notes: account.notes || '',
    };
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al cargar la cuenta';
    console.error('Error loading account:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (isEditMode.value) {
    loadAccount();
  }
});
</script>

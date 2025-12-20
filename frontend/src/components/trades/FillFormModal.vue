<template>
  <Modal :show="true" @close="$emit('close')">
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Agregar Fill</h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Tipo -->
        <div>
          <Label htmlFor="type">Tipo *</Label>
          <Select id="type" v-model="form.type" class="mt-1" required>
            <option value="ENTRY">ENTRY</option>
            <option value="EXIT">EXIT</option>
            <option value="FEE">FEE</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </Select>
        </div>

        <!-- Modo de entrada (solo para ENTRY/EXIT) -->
        <div v-if="form.type === 'ENTRY' || form.type === 'EXIT'">
          <Label>Modo de entrada</Label>
          <div class="mt-1 flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="inputMode"
                value="units"
                class="text-primary"
              />
              <span>Unidades</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="inputMode"
                value="dollars"
                class="text-primary"
              />
              <span>Valor en dólares</span>
            </label>
          </div>
        </div>

        <!-- Quantity y Price (solo para ENTRY/EXIT) -->
        <div v-if="form.type === 'ENTRY' || form.type === 'EXIT'" class="space-y-4">
          <div v-if="inputMode === 'units'" class="grid grid-cols-2 gap-4">
            <div>
              <Input
                v-model.number="form.quantity"
                type="number"
                step="0.00000001"
                label="Quantity (unidades) *"
                required
                :error="errors.quantity"
              />
            </div>
            <div>
              <Input
                v-model.number="form.price"
                type="number"
                step="0.00000001"
                label="Price *"
                required
                :error="errors.price"
              />
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Input
                  v-model.number="dollarValue"
                  type="number"
                  step="0.01"
                  :label="form.type === 'ENTRY' ? 'Valor en dólares *' : 'Valor en dólares (relativo a precio entrada) *'"
                  required
                  :error="errors.dollarValue"
                  @input="calculateQuantityFromDollars"
                />
                <p v-if="form.type === 'EXIT'" class="text-xs text-text-secondary mt-1">
                  Basado en precio entrada: {{ avgEntryPrice ? avgEntryPrice.toFixed(2) : 'N/A' }}
                </p>
              </div>
              <div>
                <Input
                  v-model.number="form.price"
                  type="number"
                  step="0.00000001"
                  :label="form.type === 'ENTRY' ? 'Price *' : 'Price de salida *'"
                  required
                  :error="errors.price"
                  @input="calculateQuantityFromDollars"
                />
              </div>
            </div>
            <div>
              <Label>Quantity calculada</Label>
              <Input
                :value="calculatedQuantity?.toFixed(8) || ''"
                type="text"
                readonly
                class="mt-1 bg-background-secondary"
              />
              <p class="text-xs text-text-secondary mt-1">
                {{ calculatedQuantity ? `${calculatedQuantity.toFixed(8)} unidades` : 'Ingresa valor y precio para calcular' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Fee -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Input
              v-model.number="form.fee"
              type="number"
              step="0.01"
              label="Fee"
              placeholder="0"
            />
          </div>
          <div>
            <Input
              v-model="form.feeCurrency"
              label="Fee Currency"
              placeholder="USD"
            />
          </div>
        </div>

        <!-- Datetime -->
        <div>
          <Label htmlFor="datetime">Fecha y Hora *</Label>
          <Input
            id="datetime"
            v-model="form.datetime"
            type="datetime-local"
            class="mt-1"
            required
            :error="errors.datetime"
          />
        </div>

        <!-- Notes -->
        <div>
          <Textarea
            v-model="form.notes"
            label="Notas"
            :rows="3"
          />
        </div>

        <!-- Error -->
        <div v-if="generalError" class="p-3 bg-loss/20 border border-loss/30 rounded-md">
          <p class="text-loss text-sm">{{ generalError }}</p>
        </div>

        <!-- Botones -->
        <div class="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" @click="$emit('close')">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" :loading="loading">
            Guardar
          </Button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useFillsStore } from '@/stores/fills';
import { useTradesStore } from '@/stores/trades';
import type { CreateFillDto } from '@/types';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const props = defineProps<{
  tradeId: string;
  trade?: any;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const fillsStore = useFillsStore();
const tradesStore = useTradesStore();
const loading = ref(false);
const generalError = ref<string | null>(null);
const inputMode = ref<'units' | 'dollars'>('dollars');
const dollarValue = ref<number | undefined>(undefined);

const form = ref<CreateFillDto>({
  tradeId: props.tradeId,
  type: 'ENTRY',
  quantity: undefined,
  price: undefined,
  fee: 0,
  feeCurrency: 'USD',
  datetime: new Date().toISOString().slice(0, 16),
  notes: '',
});

const errors = ref<Record<string, string>>({});

// Obtener precio promedio de entrada del trade
const avgEntryPrice = computed(() => {
  return props.trade?.avgEntryPrice || tradesStore.selectedTrade?.avgEntryPrice || null;
});

// Calcular quantity desde dólares
const calculatedQuantity = computed(() => {
  if (inputMode.value !== 'dollars' || !dollarValue.value || !form.value.price) {
    return form.value.quantity || null;
  }

  if (form.value.type === 'ENTRY') {
    // ENTRY: quantity = valor / price
    return dollarValue.value / form.value.price;
  } else {
    // EXIT: quantity = valor / precio_entrada (no precio de salida)
    const entryPrice = avgEntryPrice.value || form.value.price;
    return dollarValue.value / entryPrice;
  }
});

const calculateQuantityFromDollars = () => {
  if (inputMode.value === 'dollars' && calculatedQuantity.value) {
    form.value.quantity = calculatedQuantity.value;
  }
};

watch(() => props.tradeId, async (newId) => {
  form.value.tradeId = newId;
  // Cargar trade para obtener avgEntryPrice
  if (newId) {
    await tradesStore.fetchTrade(newId);
  }
});

watch(inputMode, (newMode) => {
  if (newMode === 'units') {
    dollarValue.value = undefined;
  } else {
    // Al cambiar a dólares, calcular desde quantity si existe
    if (form.value.quantity && form.value.price) {
      if (form.value.type === 'ENTRY') {
        dollarValue.value = form.value.quantity * form.value.price;
      } else {
        const entryPrice = avgEntryPrice.value || form.value.price;
        dollarValue.value = form.value.quantity * entryPrice;
      }
    }
  }
});

watch(() => form.value.type, () => {
  // Resetear valores al cambiar tipo
  form.value.quantity = undefined;
  form.value.price = undefined;
  dollarValue.value = undefined;
});

onMounted(async () => {
  // Cargar trade para obtener avgEntryPrice
  if (props.tradeId) {
    await tradesStore.fetchTrade(props.tradeId);
  }
});

const validate = (): boolean => {
  errors.value = {};

  if (form.value.type === 'ENTRY' || form.value.type === 'EXIT') {
    if (inputMode.value === 'dollars') {
      if (!dollarValue.value || dollarValue.value <= 0) {
        errors.value.dollarValue = 'Valor en dólares es requerido y debe ser mayor a 0';
        return false;
      }
      if (!form.value.price || form.value.price <= 0) {
        errors.value.price = 'Price es requerido y debe ser mayor a 0';
        return false;
      }
      // Asegurar que quantity esté calculado
      if (!calculatedQuantity.value || calculatedQuantity.value <= 0) {
        errors.value.dollarValue = 'No se pudo calcular la cantidad. Verifica el precio de entrada.';
        return false;
      }
      form.value.quantity = calculatedQuantity.value;
    } else {
      if (!form.value.quantity || form.value.quantity <= 0) {
        errors.value.quantity = 'Quantity es requerido y debe ser mayor a 0';
        return false;
      }
      if (!form.value.price || form.value.price <= 0) {
        errors.value.price = 'Price es requerido y debe ser mayor a 0';
        return false;
      }
    }
  }

  if (!form.value.datetime) {
    errors.value.datetime = 'Fecha y hora es requerida';
    return false;
  }

  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;

  loading.value = true;
  generalError.value = null;

  try {
    await fillsStore.createFill({
      ...form.value,
      datetime: new Date(form.value.datetime).toISOString(),
    });
    emit('saved');
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al crear fill';
  } finally {
    loading.value = false;
  }
};
</script>


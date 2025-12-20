<template>
  <div class="p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a instrumentos
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Instrumento' : 'Nuevo Instrumento' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Market y Symbol -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                v-model="form.market"
                label="Mercado"
                placeholder="BINANCE, NASDAQ, NYSE, FX"
                required
                :disabled="isEditMode"
                :error="errors.market"
                @input="updateTickerPreview"
              />
              <p class="mt-1 text-xs text-text-secondary">
                Ej: BINANCE, NASDAQ, NYSE, FX
              </p>
            </div>

            <div>
              <Input
                v-model="form.symbol"
                label="Símbolo"
                placeholder="BTCUSDT, AAPL, SPY, EURUSD"
                required
                :disabled="isEditMode"
                :error="errors.symbol"
                @input="updateTickerPreview"
              />
              <p class="mt-1 text-xs text-text-secondary">
                Ej: BTCUSDT, AAPL, SPY, EURUSD
              </p>
            </div>
          </div>

          <!-- Ticker Preview -->
          <div v-if="tickerPreview" class="p-3 bg-background-secondary rounded-md border border-border">
            <Label>Ticker generado:</Label>
            <div class="mt-1 font-mono text-info font-semibold text-lg">
              {{ tickerPreview }}
            </div>
            <p class="mt-1 text-xs text-text-secondary">
              Este será el identificador único del instrumento
            </p>
          </div>

          <!-- Nombre -->
          <div>
            <Input
              v-model="form.name"
              label="Nombre completo"
              placeholder="Bitcoin, Apple Inc., SPDR S&P 500 ETF"
              required
              :error="errors.name"
            />
          </div>

          <!-- Tipo y Moneda de Cotización -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" v-model="form.type" class="mt-1" required :error="errors.type">
                <option value="">Seleccionar tipo</option>
                <option value="CRYPTO">Crypto</option>
                <option value="STOCK">Stock</option>
                <option value="ETF">ETF</option>
                <option value="FOREX">Forex</option>
                <option value="FUTURES">Futures</option>
                <option value="OPTIONS">Options</option>
              </Select>
              <p v-if="errors.type" class="mt-1 text-sm text-loss">{{ errors.type }}</p>
            </div>

            <div>
              <Label htmlFor="currencyQuote">Moneda de Cotización</Label>
              <Select
                id="currencyQuote"
                v-model="form.currencyQuote"
                class="mt-1"
                required
                :error="errors.currencyQuote"
              >
                <option value="">Seleccionar moneda</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="COP">COP</option>
              </Select>
              <p v-if="errors.currencyQuote" class="mt-1 text-sm text-loss">
                {{ errors.currencyQuote }}
              </p>
            </div>
          </div>

          <!-- Tick Size y Contract Size -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                v-model="form.tickSize"
                type="number"
                step="0.00000001"
                min="0.00000001"
                label="Tick Size (opcional)"
                placeholder="0.01"
                :error="errors.tickSize"
                hint="Tamaño mínimo de movimiento de precio"
              />
            </div>

            <div>
              <Input
                v-model="form.contractSize"
                type="number"
                step="0.00000001"
                min="0.00000001"
                label="Contract Size (opcional)"
                placeholder="100000"
                :error="errors.contractSize"
                hint="Requerido para FOREX y FUTURES"
              />
            </div>
          </div>

          <!-- Notas -->
          <div>
            <Textarea
              v-model="form.notes"
              label="Notas (opcional)"
              placeholder="Notas adicionales sobre el instrumento..."
              :rows="3"
            />
          </div>

          <!-- Error General -->
          <Alert v-if="instrumentsStore.error" variant="danger">
            {{ instrumentsStore.error }}
          </Alert>

          <!-- Botones -->
          <div class="flex justify-end gap-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" @click="handleCancel">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" :loading="instrumentsStore.loading">
              {{ isEditMode ? 'Guardar Cambios' : 'Crear Instrumento' }}
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
import { useInstrumentsStore } from '@/stores/instruments';
import type { CreateInstrumentDto, UpdateInstrumentDto, InstrumentType } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';
import Alert from '@/components/ui/Alert.vue';

const route = useRoute();
const router = useRouter();
const instrumentsStore = useInstrumentsStore();

const isEditMode = computed(() => !!route.params.id);
const instrumentId = computed(() => route.params.id as string);

const initialForm: CreateInstrumentDto & UpdateInstrumentDto = {
  market: '',
  symbol: '',
  name: '',
  type: 'CRYPTO',
  currencyQuote: 'USD',
  tickSize: undefined,
  contractSize: undefined,
  notes: '',
};

const form = ref<CreateInstrumentDto & UpdateInstrumentDto>({ ...initialForm });
const errors = ref<Record<string, string | null>>({});
const tickerPreview = ref<string>('');

// Generar preview del ticker
const updateTickerPreview = () => {
  if (form.value.market && form.value.symbol) {
    tickerPreview.value = `${form.value.market.toUpperCase()}:${form.value.symbol.toUpperCase()}`;
  } else {
    tickerPreview.value = '';
  }
};

// Cargar datos del instrumento si estamos en modo edición
onMounted(async () => {
  if (isEditMode.value) {
    await instrumentsStore.fetchInstrument(instrumentId.value);
    if (instrumentsStore.selectedInstrument) {
      const inst = instrumentsStore.selectedInstrument;
      form.value = {
        market: inst.market,
        symbol: inst.symbol,
        name: inst.name,
        type: inst.type,
        currencyQuote: inst.currencyQuote,
        tickSize: inst.tickSize || undefined,
        contractSize: inst.contractSize || undefined,
        notes: inst.notes || '',
      };
      tickerPreview.value = inst.ticker;
    }
  }
});

// Watch para actualizar preview cuando cambian market o symbol
watch([() => form.value.market, () => form.value.symbol], () => {
  if (!isEditMode.value) {
    updateTickerPreview();
  }
});

// Watch para limpiar errores
watch(form.value, () => {
  errors.value = {};
  instrumentsStore.clearError();
});

const validateForm = (): boolean => {
  let isValid = true;
  errors.value = {};

  if (!form.value.market || form.value.market.trim().length === 0) {
    errors.value.market = 'El mercado es requerido.';
    isValid = false;
  }

  if (!form.value.symbol || form.value.symbol.trim().length === 0) {
    errors.value.symbol = 'El símbolo es requerido.';
    isValid = false;
  }

  if (!form.value.name || form.value.name.trim().length === 0) {
    errors.value.name = 'El nombre es requerido.';
    isValid = false;
  }

  if (!form.value.type) {
    errors.value.type = 'El tipo es requerido.';
    isValid = false;
  }

  if (!form.value.currencyQuote || form.value.currencyQuote.trim().length === 0) {
    errors.value.currencyQuote = 'La moneda de cotización es requerida.';
    isValid = false;
  }

  if (form.value.tickSize !== undefined && form.value.tickSize <= 0) {
    errors.value.tickSize = 'El tick size debe ser mayor que 0.';
    isValid = false;
  }

  if (form.value.contractSize !== undefined && form.value.contractSize <= 0) {
    errors.value.contractSize = 'El contract size debe ser mayor que 0.';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    // Normalizar market y symbol a uppercase
    const submitData = {
      ...form.value,
      market: form.value.market.toUpperCase().trim(),
      symbol: form.value.symbol.toUpperCase().trim(),
      currencyQuote: form.value.currencyQuote.toUpperCase().trim(),
      name: form.value.name.trim(),
      notes: form.value.notes?.trim() || undefined,
    };

    if (isEditMode.value) {
      // En modo edición, no enviamos market y symbol
      const { market, symbol, ...updateData } = submitData;
      await instrumentsStore.updateInstrument(instrumentId.value, updateData as UpdateInstrumentDto);
      alert('Instrumento actualizado exitosamente.');
    } else {
      await instrumentsStore.createInstrument(submitData as CreateInstrumentDto);
      alert('Instrumento creado exitosamente.');
    }
    router.push({ name: 'Instruments' });
  } catch (err: any) {
    // El error ya se maneja en el store y se muestra en <Alert>
    console.error('Error submitting instrument form:', err);
  }
};

const handleCancel = () => {
  router.push({ name: 'Instruments' });
};
</script>


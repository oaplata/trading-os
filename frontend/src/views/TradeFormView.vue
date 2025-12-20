<template>
  <div class="min-h-screen p-8">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a trades
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Trade' : 'Nuevo Trade' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Account e Instrument -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountId">Cuenta *</Label>
              <Select
                id="accountId"
                v-model="form.accountId"
                class="mt-1"
                required
                :error="errors.accountId"
              >
                <option value="">Seleccionar cuenta</option>
                <option
                  v-for="account in accountsStore.activeAccounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }} ({{ account.currency }})
                </option>
              </Select>
            </div>

            <div>
              <Label htmlFor="instrumentId">Instrumento *</Label>
              <Select
                id="instrumentId"
                v-model="form.instrumentId"
                class="mt-1"
                required
                :error="errors.instrumentId"
              >
                <option value="">Seleccionar instrumento</option>
                <option
                  v-for="instrument in instrumentsStore.activeInstruments"
                  :key="instrument.id"
                  :value="instrument.id"
                >
                  {{ instrument.ticker }} - {{ instrument.name }}
                </option>
              </Select>
            </div>
          </div>

          <!-- Side y Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="side">Lado *</Label>
              <div class="mt-1 flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="form.side"
                    value="LONG"
                    required
                    class="text-primary"
                  />
                  <span>LONG</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="form.side"
                    value="SHORT"
                    required
                    class="text-primary"
                  />
                  <span>SHORT</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" v-model="form.type" class="mt-1">
                <option value="SPOT">Spot</option>
                <option value="MARGIN">Margin</option>
                <option value="FUTURES">Futures</option>
                <option value="OPTIONS">Options</option>
              </Select>
            </div>
          </div>

          <!-- Strategy y Setup -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strategyId">Estrategia</Label>
              <Select
                id="strategyId"
                v-model="form.strategyId"
                class="mt-1"
                @change="handleStrategyChange"
              >
                <option value="">Sin estrategia</option>
                <option
                  v-for="strategy in strategiesStore.activeStrategies"
                  :key="strategy.id"
                  :value="strategy.id"
                >
                  {{ strategy.name }}
                </option>
              </Select>
            </div>

            <div>
              <Label htmlFor="setupId">Setup</Label>
              <Select
                id="setupId"
                v-model="form.setupId"
                class="mt-1"
                :disabled="!form.strategyId"
              >
                <option value="">Sin setup</option>
                <option
                  v-for="setup in filteredSetups"
                  :key="setup.id"
                  :value="setup.id"
                >
                  {{ setup.name }}
                </option>
              </Select>
            </div>
          </div>

          <!-- Timeframe -->
          <div>
            <Input
              v-model="form.timeframe"
              label="Timeframe"
              placeholder="Ej: 4H, 1D, 1W"
            />
          </div>

          <!-- Planned Entry y Stop Loss -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                v-model.number="form.plannedEntry"
                type="number"
                step="0.00000001"
                label="Planned Entry"
                placeholder="Precio de entrada planificado"
              />
            </div>

            <div>
              <Input
                v-model.number="form.plannedStopLoss"
                type="number"
                step="0.00000001"
                label="Planned Stop Loss *"
                placeholder="Stop loss planificado"
                required
                :error="errors.plannedStopLoss"
              />
            </div>
          </div>

          <!-- Planned Take Profits -->
          <div>
            <Label>Planned Take Profits</Label>
            <div class="mt-1 space-y-2">
              <div
                v-for="(tp, index) in plannedTakeProfits"
                :key="index"
                class="flex gap-2"
              >
                <Input
                  v-model.number="plannedTakeProfits[index]"
                  type="number"
                  step="0.00000001"
                  :placeholder="`TP ${index + 1}`"
                  class="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="removeTakeProfit(index)"
                >
                  ✕
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                @click="addTakeProfit"
              >
                + Agregar TP
              </Button>
            </div>
          </div>

          <!-- Risk Management -->
          <div>
            <Label>Riesgo *</Label>
            <div class="mt-1 flex gap-4 mb-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="riskType"
                  value="percent"
                  class="text-primary"
                />
                <span>Porcentaje (%)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="riskType"
                  value="amount"
                  class="text-primary"
                />
                <span>Monto Fijo</span>
              </label>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                v-if="riskType === 'percent'"
                v-model.number="form.riskPercent"
                type="number"
                step="0.01"
                label="Risk %"
                placeholder="Ej: 2.5"
                :error="errors.riskPercent"
              />
              <Input
                v-if="riskType === 'amount'"
                v-model.number="form.riskAmount"
                type="number"
                step="0.01"
                label="Risk Amount"
                placeholder="Monto en moneda de la cuenta"
                :error="errors.riskAmount"
              />
              <Input
                v-model.number="form.plannedSize"
                type="number"
                step="0.00000001"
                label="Planned Size (opcional)"
                placeholder="Tamaño planificado"
              />
            </div>
          </div>

          <!-- Tags -->
          <div>
            <Label>Tags</Label>
            <div class="mt-1 flex flex-wrap gap-2">
              <Badge
                v-for="(tag, index) in tags"
                :key="index"
                variant="info"
                size="sm"
                class="cursor-pointer"
                @click="removeTag(index)"
              >
                {{ tag }} ✕
              </Badge>
              <Input
                v-model="tagInput"
                placeholder="Agregar tag..."
                class="flex-1 min-w-[200px]"
                @keyup.enter="addTag"
              />
            </div>
          </div>

          <!-- Thesis -->
          <div>
            <Textarea
              v-model="form.thesis"
              label="Tesis"
              placeholder="Razón del trade, análisis, contexto..."
              :rows="5"
            />
          </div>

          <!-- Screenshot URL -->
          <div>
            <Input
              v-model="form.screenshotUrl"
              type="url"
              label="Screenshot URL"
              placeholder="https://..."
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
            <Button
              v-if="!isEditMode && selectedTrade?.status === 'PLANNED'"
              type="button"
              variant="warning"
              @click="handleOpenTrade"
            >
              Abrir Trade
            </Button>
            <Button type="submit" variant="primary" :loading="loading">
              {{ isEditMode ? 'Actualizar' : 'Crear' }}
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
import { useTradesStore } from '@/stores/trades';
import { useAccountsStore } from '@/stores/accounts';
import { useInstrumentsStore } from '@/stores/instruments';
import { useStrategiesStore } from '@/stores/strategies';
import { useSetupsStore } from '@/stores/setups';
import type { CreateTradeDto, UpdateTradeDto } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';
import Badge from '@/components/ui/Badge.vue';

const route = useRoute();
const router = useRouter();
const tradesStore = useTradesStore();
const accountsStore = useAccountsStore();
const instrumentsStore = useInstrumentsStore();
const strategiesStore = useStrategiesStore();
const setupsStore = useSetupsStore();

const isEditMode = computed(() => !!route.params.id);
const loading = ref(false);
const generalError = ref<string | null>(null);
const riskType = ref<'percent' | 'amount'>('percent');
const tagInput = ref('');
const plannedTakeProfits = ref<number[]>([]);

const selectedTrade = computed(() => tradesStore.selectedTrade);

const form = ref<CreateTradeDto>({
  accountId: '',
  instrumentId: '',
  strategyId: '',
  setupId: '',
  side: 'LONG',
  type: 'SPOT',
  timeframe: '',
  plannedEntry: undefined,
  plannedStopLoss: 0,
  plannedTakeProfits: [],
  riskPercent: undefined,
  riskAmount: undefined,
  plannedSize: undefined,
  tags: [],
  thesis: '',
  screenshotUrl: '',
});

const errors = ref<Record<string, string>>({});

const filteredSetups = computed(() => {
  if (!form.value.strategyId) return [];
  return setupsStore.setups.filter((s) => s.strategyId === form.value.strategyId);
});

const tags = computed(() => form.value.tags || []);

const handleStrategyChange = () => {
  form.value.setupId = '';
};

const addTag = () => {
  if (tagInput.value.trim() && !form.value.tags?.includes(tagInput.value.trim())) {
    if (!form.value.tags) form.value.tags = [];
    form.value.tags.push(tagInput.value.trim());
    tagInput.value = '';
  }
};

const removeTag = (index: number) => {
  if (form.value.tags) {
    form.value.tags.splice(index, 1);
  }
};

const addTakeProfit = () => {
  plannedTakeProfits.value.push(0);
};

const removeTakeProfit = (index: number) => {
  plannedTakeProfits.value.splice(index, 1);
};

watch(plannedTakeProfits, (newVal) => {
  form.value.plannedTakeProfits = newVal.filter((tp) => tp > 0);
}, { deep: true });

const validate = (): boolean => {
  errors.value = {};

  if (!form.value.accountId) {
    errors.value.accountId = 'La cuenta es requerida';
    return false;
  }

  if (!form.value.instrumentId) {
    errors.value.instrumentId = 'El instrumento es requerido';
    return false;
  }

  if (!form.value.plannedStopLoss || form.value.plannedStopLoss <= 0) {
    errors.value.plannedStopLoss = 'El stop loss es requerido y debe ser mayor a 0';
    return false;
  }

  if (!form.value.riskPercent && !form.value.riskAmount) {
    errors.value.riskPercent = 'Debe especificar riskPercent o riskAmount';
    return false;
  }

  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;

  loading.value = true;
  generalError.value = null;

  try {
    const dto: CreateTradeDto | UpdateTradeDto = {
      ...form.value,
      plannedTakeProfits: plannedTakeProfits.value.filter((tp) => tp > 0),
      tags: form.value.tags || [],
      strategyId: form.value.strategyId || undefined,
      setupId: form.value.setupId || undefined,
      timeframe: form.value.timeframe || undefined,
      plannedEntry: form.value.plannedEntry || undefined,
      thesis: form.value.thesis || undefined,
      screenshotUrl: form.value.screenshotUrl || undefined,
    };

    if (isEditMode.value) {
      await tradesStore.updateTrade(route.params.id as string, dto as UpdateTradeDto);
    } else {
      await tradesStore.createTrade(dto as CreateTradeDto);
    }

    router.push('/trades');
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al guardar trade';
  } finally {
    loading.value = false;
  }
};

const handleOpenTrade = async () => {
  if (!isEditMode.value || !selectedTrade.value) return;
  
  try {
    await tradesStore.openTrade(selectedTrade.value.id);
    router.push(`/trades/${selectedTrade.value.id}`);
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al abrir trade';
  }
};

const handleCancel = () => {
  router.push('/trades');
};

onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    instrumentsStore.fetchInstruments(),
    strategiesStore.fetchStrategies(),
    setupsStore.fetchSetups(),
  ]);

  if (isEditMode.value) {
    const trade = await tradesStore.fetchTrade(route.params.id as string);
    if (trade) {
      form.value = {
        accountId: trade.accountId,
        instrumentId: trade.instrumentId,
        strategyId: trade.strategyId || '',
        setupId: trade.setupId || '',
        side: trade.side,
        type: trade.type,
        timeframe: trade.timeframe || '',
        plannedEntry: trade.plannedEntry || undefined,
        plannedStopLoss: trade.plannedStopLoss || 0,
        plannedTakeProfits: trade.plannedTakeProfits || [],
        riskPercent: trade.riskPercent || undefined,
        riskAmount: trade.riskAmount || undefined,
        plannedSize: trade.plannedSize || undefined,
        tags: trade.tags || [],
        thesis: trade.thesis || '',
        screenshotUrl: trade.screenshotUrl || '',
      };
      plannedTakeProfits.value = trade.plannedTakeProfits || [];
      if (trade.riskPercent) {
        riskType.value = 'percent';
      } else if (trade.riskAmount) {
        riskType.value = 'amount';
      }
    }
  }
});
</script>


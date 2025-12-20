<template>
  <div class="min-h-screen p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleBack"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a trades
        </button>
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold">
              {{ trade?.instrument?.ticker || 'Trade' }} - {{ trade?.side }}
            </h1>
            <p class="text-text-secondary mt-2">
              {{ getStatusLabel(trade?.status || '') }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="trade?.status === 'PLANNED'"
              @click="handleOpenTrade"
              variant="warning"
            >
              Abrir Trade
            </Button>
            <Button
              v-if="trade?.status === 'OPEN'"
              @click="showCloseModal = true"
              variant="danger"
            >
              Cerrar Trade
            </Button>
            <Button @click="handleEditTrade" variant="ghost">
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div v-if="tradesStore.loading" class="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>

      <div v-else-if="!trade" class="text-center py-12">
        <p class="text-text-secondary text-lg">Trade no encontrado</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Resumen -->
        <Card>
          <h2 class="text-xl font-semibold mb-4">Resumen</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm text-text-secondary">Net PnL</p>
              <p
                class="text-lg font-bold mono-number"
                :class="getPnLClass(trade.netPnL)"
              >
                {{ formatCurrency(trade.netPnL || 0, trade.account?.currency || 'USD') }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">R Multiple</p>
              <p
                class="text-lg font-bold mono-number"
                :class="getPnLClass(trade.rMultiple)"
              >
                {{ trade.rMultiple ? trade.rMultiple.toFixed(2) : '-' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Total Fees</p>
              <p class="text-lg font-bold mono-number">
                {{ formatCurrency(trade.totalFees, trade.account?.currency || 'USD') }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Duración</p>
              <p class="text-lg font-bold">
                {{ getDuration() }}
              </p>
            </div>
            <div v-if="trade.avgEntryPrice">
              <p class="text-sm text-text-secondary">Avg Entry</p>
              <p class="text-lg font-bold mono-number">
                {{ trade.avgEntryPrice.toFixed(8) }}
              </p>
            </div>
            <div v-if="trade.avgExitPrice">
              <p class="text-sm text-text-secondary">Avg Exit</p>
              <p class="text-lg font-bold mono-number">
                {{ trade.avgExitPrice.toFixed(8) }}
              </p>
            </div>
            <div v-if="trade.breakEvenPrice">
              <p class="text-sm text-text-secondary">Break Even</p>
              <p class="text-lg font-bold mono-number">
                {{ trade.breakEvenPrice.toFixed(8) }}
              </p>
            </div>
            <div v-if="trade.openQuantity !== undefined && trade.openQuantity > 0">
              <p class="text-sm text-text-secondary">Qty Abierta</p>
              <p class="text-lg font-bold mono-number">
                {{ trade.openQuantity.toFixed(8) }}
              </p>
            </div>
          </div>
        </Card>

        <!-- Plan -->
        <Card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Plan</h2>
            <Button
              v-if="trade.status !== 'CLOSED'"
              @click="handleEditTrade"
              variant="ghost"
              size="sm"
            >
              Editar Plan
            </Button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-text-secondary">Planned Entry</p>
              <p class="font-medium">
                {{ trade.plannedEntry ? trade.plannedEntry.toFixed(8) : '-' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Planned Stop Loss</p>
              <p class="font-medium">
                {{ trade.plannedStopLoss ? trade.plannedStopLoss.toFixed(8) : '-' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Planned Take Profits</p>
              <div v-if="trade.plannedTakeProfits && trade.plannedTakeProfits.length > 0" class="flex flex-wrap gap-2 mt-1">
                <Badge
                  v-for="(tp, index) in trade.plannedTakeProfits"
                  :key="index"
                  variant="info"
                  size="sm"
                >
                  TP{{ index + 1 }}: {{ tp.toFixed(8) }}
                </Badge>
              </div>
              <p v-else class="text-text-secondary">-</p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Risk</p>
              <p class="font-medium">
                <span v-if="trade.riskPercent">{{ trade.riskPercent }}%</span>
                <span v-else-if="trade.riskAmount">
                  {{ formatCurrency(trade.riskAmount, trade.account?.currency || 'USD') }}
                </span>
                <span v-else>-</span>
              </p>
            </div>
            <div v-if="trade.thesis" class="md:col-span-2">
              <p class="text-sm text-text-secondary mb-1">Tesis</p>
              <p class="text-sm">{{ trade.thesis }}</p>
            </div>
          </div>
        </Card>

        <!-- Fills Timeline -->
        <Card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Fills Timeline</h2>
            <Button
              v-if="trade.status === 'OPEN'"
              @click="showFillModal = true"
              variant="primary"
            >
              Agregar Fill
            </Button>
          </div>

          <div v-if="fillsStore.loading" class="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>

          <div v-else-if="fillsStore.fills.length === 0" class="text-center py-8">
            <p class="text-text-secondary">No hay fills registrados</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-2 px-4 text-sm text-text-secondary">Tipo</th>
                  <th class="text-right py-2 px-4 text-sm text-text-secondary">Quantity</th>
                  <th class="text-right py-2 px-4 text-sm text-text-secondary">Price</th>
                  <th class="text-right py-2 px-4 text-sm text-text-secondary">Fee</th>
                  <th class="text-left py-2 px-4 text-sm text-text-secondary">Fecha</th>
                  <th class="text-right py-2 px-4 text-sm text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="fill in fillsStore.fills"
                  :key="fill.id"
                  class="border-b border-border hover:bg-background-secondary"
                >
                  <td class="py-2 px-4">
                    <Badge :variant="getFillTypeVariant(fill.type)" size="sm">
                      {{ fill.type }}
                    </Badge>
                  </td>
                  <td class="py-2 px-4 text-right mono-number">
                    {{ fill.quantity ? fill.quantity.toFixed(8) : '-' }}
                  </td>
                  <td class="py-2 px-4 text-right mono-number">
                    {{ fill.price ? fill.price.toFixed(8) : '-' }}
                  </td>
                  <td class="py-2 px-4 text-right mono-number">
                    {{ formatCurrency(fill.fee, fill.feeCurrency) }}
                  </td>
                  <td class="py-2 px-4 text-sm">
                    {{ formatDate(fill.datetime) }}
                  </td>
                  <td class="py-2 px-4">
                    <div class="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="handleEditFill(fill.id)"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="handleDeleteFill(fill.id)"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <!-- Checklist (si está cerrado) -->
        <Card v-if="trade.status === 'CLOSED'">
          <h2 class="text-xl font-semibold mb-4">Checklist</h2>
          <div v-if="checklistStore.loading" class="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
          <div v-else-if="checklistStore.checklist.length === 0" class="text-center py-8">
            <p class="text-text-secondary">No hay checklist disponible</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in checklistStore.checklist"
              :key="item.ruleId"
              class="flex items-center gap-3 p-3 border border-border rounded-md"
            >
              <input
                type="checkbox"
                :checked="item.completed"
                disabled
                class="w-4 h-4"
              />
              <div class="flex-1">
                <p class="font-medium">{{ item.ruleName }}</p>
                <p v-if="item.ruleDescription" class="text-sm text-text-secondary">
                  {{ item.ruleDescription }}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <!-- Post-trade Review (si está cerrado) -->
        <Card v-if="trade.status === 'CLOSED'">
          <h2 class="text-xl font-semibold mb-4">Post-trade Review</h2>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-text-secondary">Resultado</p>
              <Badge :variant="getResultVariant(trade.result)" size="sm" class="mt-1">
                {{ getResultLabel(trade.result) }}
              </Badge>
            </div>
            <div v-if="trade.emotion">
              <p class="text-sm text-text-secondary">Emoción</p>
              <p class="font-medium">{{ getEmotionLabel(trade.emotion) }}</p>
            </div>
            <div v-if="trade.lessonLearned">
              <p class="text-sm text-text-secondary mb-1">Lección Aprendida</p>
              <p class="text-sm">{{ trade.lessonLearned }}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Modales -->
    <FillFormModal
      v-if="showFillModal"
      :trade-id="trade?.id || ''"
      :trade="trade"
      @close="showFillModal = false"
      @saved="handleFillSaved"
    />

    <CloseTradeModal
      v-if="showCloseModal"
      :trade="trade"
      @close="showCloseModal = false"
      @closed="handleTradeClosed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTradesStore } from '@/stores/trades';
import { useFillsStore } from '@/stores/fills';
import { useTradeChecklistStore } from '@/stores/trade-checklist';
import type { Trade } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import FillFormModal from '@/components/trades/FillFormModal.vue';
import CloseTradeModal from '@/components/trades/CloseTradeModal.vue';
import { formatCurrency, formatDate } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const tradesStore = useTradesStore();
const fillsStore = useFillsStore();
const checklistStore = useTradeChecklistStore();

const showFillModal = ref(false);
const showCloseModal = ref(false);

const trade = computed(() => tradesStore.selectedTrade);

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PLANNED: 'Planificado',
    OPEN: 'Abierto',
    CLOSED: 'Cerrado',
    CANCELED: 'Cancelado',
  };
  return labels[status] || status;
};

const getPnLClass = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '';
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-danger';
  return '';
};

const getDuration = () => {
  if (!trade.value?.openTime) return '-';
  const end = trade.value.closeTime ? new Date(trade.value.closeTime) : new Date();
  const start = new Date(trade.value.openTime);
  const diff = end.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

const getFillTypeVariant = (type: string) => {
  switch (type) {
    case 'ENTRY':
      return 'success';
    case 'EXIT':
      return 'danger';
    case 'FEE':
      return 'warning';
    case 'ADJUSTMENT':
      return 'info';
    default:
      return 'default';
  }
};

const getResultVariant = (result: string | null | undefined) => {
  switch (result) {
    case 'WIN':
      return 'success';
    case 'LOSS':
      return 'danger';
    case 'BREAK_EVEN':
      return 'info';
    default:
      return 'default';
  }
};

const getResultLabel = (result: string | null | undefined) => {
  const labels: Record<string, string> = {
    WIN: 'Win',
    LOSS: 'Loss',
    BREAK_EVEN: 'Break Even',
  };
  return result ? labels[result] || result : '-';
};

const getEmotionLabel = (emotion: string) => {
  const labels: Record<string, string> = {
    CALM: 'Calmado',
    NEUTRAL: 'Neutral',
    ANXIOUS: 'Ansioso',
    GREEDY: 'Codicioso',
  };
  return labels[emotion] || emotion;
};

const handleBack = () => {
  router.push('/trades');
};

const handleEditTrade = () => {
  router.push(`/trades/${trade.value?.id}/edit`);
};

const handleOpenTrade = async () => {
  if (!trade.value) return;
  try {
    await tradesStore.openTrade(trade.value.id);
    await loadData();
  } catch (error) {
    console.error('Error opening trade:', error);
  }
};

const handleEditFill = (fillId: string) => {
  // TODO: Implementar edición de fill
  console.log('Edit fill:', fillId);
};

const handleDeleteFill = async (fillId: string) => {
  if (!confirm('¿Estás seguro de eliminar este fill?')) return;
  try {
    await fillsStore.deleteFill(fillId);
    await loadData();
  } catch (error) {
    console.error('Error deleting fill:', error);
  }
};

const handleFillSaved = async () => {
  showFillModal.value = false;
  await loadData();
};

const handleTradeClosed = async () => {
  showCloseModal.value = false;
  await loadData();
};

const loadData = async () => {
  if (!trade.value) return;
  await Promise.all([
    tradesStore.fetchTrade(trade.value.id),
    fillsStore.fetchFillsByTrade(trade.value.id),
  ]);
  if (trade.value.status === 'CLOSED') {
    await checklistStore.fetchChecklist(trade.value.id);
  }
};

onMounted(async () => {
  const tradeId = route.params.id as string;
  await tradesStore.fetchTrade(tradeId);
  if (trade.value) {
    await fillsStore.fetchFillsByTrade(tradeId);
    if (trade.value.status === 'CLOSED') {
      await checklistStore.fetchChecklist(tradeId);
    }
  }
});
</script>


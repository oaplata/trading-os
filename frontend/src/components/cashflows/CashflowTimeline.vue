<template>
  <div class="cashflow-timeline">
    <div
      v-for="(group, groupIndex) in groupedCashflows"
      :key="group.date"
      class="timeline-group"
    >
      <!-- Fecha del grupo -->
      <div class="timeline-date-header">
        <span class="text-text-secondary text-sm font-medium">{{ group.formattedDate }}</span>
      </div>

      <!-- Items del grupo -->
      <div class="timeline-items">
        <div
          v-for="(cashflow, itemIndex) in group.items"
          :key="cashflow.id"
          class="timeline-item"
          :style="{ animationDelay: `${itemIndex * 50}ms` }"
        >
          <!-- Línea conectora -->
          <div
            v-if="groupIndex < groupedCashflows.length - 1 || itemIndex < group.items.length - 1"
            class="timeline-connector"
          />

          <!-- Icono de tipo -->
          <div :class="['timeline-icon', getCashflowIconClass(cashflow.type)]">
            <span class="text-xs font-bold">
              {{ cashflow.type === 'DEPOSIT' ? '+' : cashflow.type === 'WITHDRAWAL' ? '-' : cashflow.type === 'ADJUSTMENT' ? '±' : 'F' }}
            </span>
          </div>

          <!-- Contenido -->
          <div class="timeline-content">
            <div class="flex justify-between items-start mb-1">
              <div class="flex items-center gap-2">
                <Badge :variant="getCashflowTypeVariant(cashflow.type)" size="sm">
                  {{ cashflowTypeLabel(cashflow.type) }}
                </Badge>
                <span class="text-text-secondary text-sm">
                  {{ cashflow.account?.name || 'Cuenta eliminada' }}
                </span>
              </div>
              <CurrencyDisplay
                :value="getCashflowAmount(cashflow)"
                :currency="cashflow.currency"
                :variant="getCashflowAmountVariant(cashflow.type)"
              />
            </div>
            <p v-if="cashflow.description" class="text-text-secondary text-sm">
              {{ cashflow.description }}
            </p>
            <p v-if="cashflow.category" class="text-text-secondary text-xs mt-1">
              {{ cashflow.category }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="cashflows.length === 0" class="text-center py-12 text-text-secondary">
      <p>No hay cashflows para mostrar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Cashflow } from '@/types';
import Badge from '@/components/ui/Badge.vue';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay.vue';

interface Props {
  cashflows: Cashflow[];
}

const props = defineProps<Props>();

interface GroupedCashflow {
  date: string;
  formattedDate: string;
  items: Cashflow[];
}

const groupedCashflows = computed<GroupedCashflow[]>(() => {
  const groups: Record<string, Cashflow[]> = {};

  props.cashflows.forEach((cf) => {
    const dateKey = new Date(cf.date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(cf);
  });

  return Object.entries(groups)
    .map(([date, items]) => ({
      date,
      formattedDate: date,
      items: items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// Helpers
const cashflowTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    DEPOSIT: 'Depósito',
    WITHDRAWAL: 'Retiro',
    ADJUSTMENT: 'Ajuste',
    FEE: 'Fee',
  };
  return labels[type] || type;
};

const getCashflowTypeVariant = (
  type: string
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'success';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'danger';
  return 'default';
};

const getCashflowAmountVariant = (
  type: string
): 'default' | 'positive' | 'negative' | 'neutral' => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'positive';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'negative';
  return 'neutral';
};

const getCashflowAmount = (cashflow: Cashflow): number => {
  // Para retiros y fees, mostrar como negativo
  if (cashflow.type === 'WITHDRAWAL' || cashflow.type === 'FEE') {
    return -cashflow.amount;
  }
  return cashflow.amount;
};

const getCashflowIconClass = (type: string): string => {
  const base = 'flex items-center justify-center w-8 h-8 rounded-full border-2';
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') {
    return `${base} border-profit bg-profit/20 text-profit`;
  }
  if (type === 'WITHDRAWAL' || type === 'FEE') {
    return `${base} border-loss bg-loss/20 text-loss`;
  }
  return `${base} border-text-secondary bg-background-secondary text-text-secondary`;
};
</script>

<style scoped>
.cashflow-timeline {
  @apply relative;
}

.timeline-group {
  @apply mb-6;
}

.timeline-date-header {
  @apply mb-3 pb-2 border-b border-border;
}

.timeline-items {
  @apply relative pl-8;
}

.timeline-item {
  @apply relative mb-4 last:mb-0;
  animation: fadeInUp 0.3s ease-out both;
}

.timeline-connector {
  @apply absolute left-3 top-8 bottom-0 w-0.5 bg-border;
}

.timeline-item:last-child .timeline-connector {
  @apply hidden;
}

.timeline-icon {
  @apply absolute left-0 top-0 z-10;
}

.timeline-content {
  @apply ml-4;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>


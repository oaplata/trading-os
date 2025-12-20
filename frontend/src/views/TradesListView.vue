<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Trades</h1>
        <Button @click="handleCreateTrade" variant="primary">
          Nuevo Trade
        </Button>
      </div>

      <!-- Filtros y Búsqueda -->
      <Card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Búsqueda -->
          <div class="md:col-span-2">
            <Label for="search">Buscar</Label>
            <Input
              id="search"
              v-model="searchQuery"
              placeholder="Buscar en thesis, notes, tags..."
              class="mt-1"
              @input="handleSearch"
            />
          </div>

          <!-- Filtro por estado -->
          <div>
            <Label for="statusFilter">Estado</Label>
            <Select
              id="statusFilter"
              v-model="filters.status"
              placeholder="Todos los estados"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todos los estados</option>
              <option value="PLANNED">Planificado</option>
              <option value="OPEN">Abierto</option>
              <option value="CLOSED">Cerrado</option>
              <option value="CANCELED">Cancelado</option>
            </Select>
          </div>

          <!-- Filtro por lado -->
          <div>
            <Label for="sideFilter">Lado</Label>
            <Select
              id="sideFilter"
              v-model="filters.side"
              placeholder="Todos"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todos</option>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <!-- Filtro por cuenta -->
          <div>
            <Label for="accountFilter">Cuenta</Label>
            <Select
              id="accountFilter"
              v-model="filters.accountId"
              placeholder="Todas las cuentas"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todas las cuentas</option>
              <option v-for="account in accountsStore.accounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </Select>
          </div>

          <!-- Filtro por estrategia -->
          <div>
            <Label for="strategyFilter">Estrategia</Label>
            <Select
              id="strategyFilter"
              v-model="filters.strategyId"
              placeholder="Todas las estrategias"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todas las estrategias</option>
              <option
                v-for="strategy in strategiesStore.strategies"
                :key="strategy.id"
                :value="strategy.id"
              >
                {{ strategy.name }}
              </option>
            </Select>
          </div>

          <!-- Filtro por resultado -->
          <div>
            <Label for="resultFilter">Resultado</Label>
            <Select
              id="resultFilter"
              v-model="filters.result"
              placeholder="Todos"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todos</option>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="BREAK_EVEN">Break Even</option>
            </Select>
          </div>

          <!-- Filtro por fecha -->
          <div>
            <Label for="dateFromFilter">Desde</Label>
            <Input
              id="dateFromFilter"
              v-model="filters.dateFrom"
              type="date"
              class="mt-1"
              @change="handleFilterChange"
            />
          </div>
        </div>
      </Card>

      <!-- Tabla de trades -->
      <Card>
        <div v-if="tradesStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="tradesStore.trades.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            No hay trades registrados
          </p>
          <Button @click="handleCreateTrade" variant="primary">
            Crear primer trade
          </Button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Fecha Apertura
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Instrumento
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Lado
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Estado
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Net PnL
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  R
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Fees
                </th>
                <th class="text-center py-3 px-4 text-text-secondary text-sm font-medium">
                  # Fills
                </th>
                <th class="text-center py-3 px-4 text-text-secondary text-sm font-medium">
                  Checklist
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="trade in tradesStore.trades"
                :key="trade.id"
                class="border-b border-border hover:bg-background-secondary transition-colors"
              >
                <td class="py-3 px-4">
                  <div v-if="trade.openTime" class="text-sm">
                    {{ formatDate(trade.openTime) }}
                  </div>
                  <div v-else class="text-sm text-text-secondary">-</div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium">
                    {{ trade.instrument?.ticker || 'N/A' }}
                  </div>
                  <div v-if="trade.setup" class="text-sm text-text-secondary">
                    {{ trade.setup.name }}
                  </div>
                </td>
                <td class="py-3 px-4">
                  <Badge
                    :variant="trade.side === 'LONG' ? 'success' : 'danger'"
                    size="sm"
                  >
                    {{ trade.side }}
                  </Badge>
                </td>
                <td class="py-3 px-4">
                  <Badge :variant="getStatusVariant(trade.status)" size="sm">
                    {{ getStatusLabel(trade.status) }}
                  </Badge>
                </td>
                <td class="py-3 px-4 text-right mono-number" :class="getPnLClass(trade.netPnL)">
                  {{ formatCurrency(trade.netPnL || 0, trade.account?.currency || 'USD') }}
                </td>
                <td class="py-3 px-4 text-right mono-number" :class="getPnLClass(trade.rMultiple)">
                  {{ trade.rMultiple ? trade.rMultiple.toFixed(2) : '-' }}
                </td>
                <td class="py-3 px-4 text-right mono-number">
                  {{ formatCurrency(trade.totalFees, trade.account?.currency || 'USD') }}
                </td>
                <td class="py-3 px-4 text-center">
                  {{ trade._count?.fills || 0 }}
                </td>
                <td class="py-3 px-4 text-center">
                  <Badge
                    v-if="trade.status === 'CLOSED'"
                    :variant="trade.checklistCompleted ? 'success' : 'warning'"
                    size="sm"
                  >
                    {{ trade.checklistCompleted ? '✓' : '✗' }}
                  </Badge>
                  <span v-else class="text-text-secondary">-</span>
                </td>
                <td class="py-3 px-4">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleViewTrade(trade.id)"
                    >
                      Ver
                    </Button>
                    <Button
                      v-if="trade.status === 'PLANNED'"
                      variant="ghost"
                      size="sm"
                      @click="handleOpenTrade(trade.id)"
                    >
                      Abrir
                    </Button>
                    <Button
                      v-if="trade.status === 'OPEN'"
                      variant="ghost"
                      size="sm"
                      @click="handleCloseTrade(trade.id)"
                    >
                      Cerrar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleDuplicateTrade(trade.id)"
                    >
                      Duplicar
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div v-if="tradesStore.pagination.totalPages > 1" class="mt-6 flex justify-between items-center">
          <div class="text-sm text-text-secondary">
            Mostrando {{ (tradesStore.pagination.page - 1) * tradesStore.pagination.limit + 1 }} -
            {{ Math.min(tradesStore.pagination.page * tradesStore.pagination.limit, tradesStore.pagination.total) }}
            de {{ tradesStore.pagination.total }}
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="tradesStore.pagination.page === 1"
              @click="handlePageChange(tradesStore.pagination.page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="tradesStore.pagination.page === tradesStore.pagination.totalPages"
              @click="handlePageChange(tradesStore.pagination.page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTradesStore } from '@/stores/trades';
import { useAccountsStore } from '@/stores/accounts';
import { useStrategiesStore } from '@/stores/strategies';
import type { TradeListQuery } from '@/types';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import Label from '@/components/ui/Label.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { formatCurrency, formatDate } from '@/utils/format';

const router = useRouter();
const tradesStore = useTradesStore();
const accountsStore = useAccountsStore();
const strategiesStore = useStrategiesStore();

const searchQuery = ref('');
const filters = ref<TradeListQuery>({
  page: 1,
  limit: 50,
});

let searchTimeout: ReturnType<typeof setTimeout>;

const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filters.value.search = searchQuery.value || undefined;
    filters.value.page = 1;
    loadTrades();
  }, 500);
};

const handleFilterChange = () => {
  filters.value.page = 1;
  loadTrades();
};

const handlePageChange = (page: number) => {
  filters.value.page = page;
  loadTrades();
};

const loadTrades = async () => {
  try {
    await tradesStore.fetchTrades(filters.value);
  } catch (error) {
    console.error('Error loading trades:', error);
  }
};

const handleCreateTrade = () => {
  router.push('/trades/new');
};

const handleViewTrade = (id: string) => {
  router.push(`/trades/${id}`);
};

const handleOpenTrade = async (id: string) => {
  try {
    await tradesStore.openTrade(id);
    await loadTrades();
  } catch (error) {
    console.error('Error opening trade:', error);
  }
};

const handleCloseTrade = (id: string) => {
  router.push(`/trades/${id}?action=close`);
};

const handleDuplicateTrade = async (id: string) => {
  try {
    await tradesStore.duplicateTrade(id);
    await loadTrades();
  } catch (error) {
    console.error('Error duplicating trade:', error);
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'PLANNED':
      return 'info';
    case 'OPEN':
      return 'warning';
    case 'CLOSED':
      return 'success';
    case 'CANCELED':
      return 'default';
    default:
      return 'default';
  }
};

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

onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    strategiesStore.fetchStrategies(),
    loadTrades(),
  ]);
});
</script>


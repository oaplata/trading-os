<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Cashflows</h1>
        <Button @click="handleCreateCashflow" variant="primary">
          Nuevo Cashflow
        </Button>
      </div>

      <!-- Filtros -->
      <Card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <!-- Filtro por cuenta -->
          <div>
            <Label htmlFor="accountFilter">Cuenta</Label>
            <Select
              id="accountFilter"
              v-model="filters.accountId"
              placeholder="Todas las cuentas"
              class="mt-1"
            >
              <option value="">Todas las cuentas</option>
              <option
                v-for="account in accountsStore.accounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </Select>
          </div>

          <!-- Filtro por tipo -->
          <div>
            <Label htmlFor="typeFilter">Tipo</Label>
            <Select
              id="typeFilter"
              v-model="filters.type"
              placeholder="Todos los tipos"
              class="mt-1"
            >
              <option value="">Todos los tipos</option>
              <option value="DEPOSIT">Depósito</option>
              <option value="WITHDRAWAL">Retiro</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="FEE">Fee</option>
            </Select>
          </div>

          <!-- Filtro por fecha inicio -->
          <div>
            <Label htmlFor="startDate">Fecha Inicio</Label>
            <Input
              id="startDate"
              v-model="filters.startDate"
              type="date"
              class="mt-1"
            />
          </div>

          <!-- Filtro por fecha fin -->
          <div>
            <Label htmlFor="endDate">Fecha Fin</Label>
            <Input
              id="endDate"
              v-model="filters.endDate"
              type="date"
              class="mt-1"
            />
          </div>
        </div>

        <!-- Búsqueda y botón aplicar -->
        <div class="flex gap-4 items-end">
          <div class="flex-1">
            <Label htmlFor="search">Buscar por descripción</Label>
            <Input
              id="search"
              v-model="searchQuery"
              placeholder="Buscar..."
              class="mt-1"
            />
          </div>
          <Button variant="secondary" @click="handleApplyFilters">
            Aplicar Filtros
          </Button>
          <Button variant="ghost" @click="handleClearFilters">
            Limpiar
          </Button>
        </div>
      </Card>

      <!-- Totales -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <Label>Total Depósitos</Label>
          <p class="text-2xl font-bold mono-number text-profit mt-2">
            {{ formatCurrency(cashflowsStore.totals.deposits, getDefaultCurrency()) }}
          </p>
        </Card>
        <Card>
          <Label>Total Retiros</Label>
          <p class="text-2xl font-bold mono-number text-loss mt-2">
            {{ formatCurrency(cashflowsStore.totals.withdrawals, getDefaultCurrency()) }}
          </p>
        </Card>
        <Card>
          <Label>Total Ajustes</Label>
          <p class="text-2xl font-bold mono-number text-info mt-2">
            {{ formatCurrency(cashflowsStore.totals.adjustments, getDefaultCurrency()) }}
          </p>
        </Card>
        <Card>
          <Label>Neto</Label>
          <p
            :class="[
              'text-2xl font-bold mono-number mt-2',
              cashflowsStore.totals.net >= 0 ? 'text-profit' : 'text-loss',
            ]"
          >
            {{ formatCurrency(cashflowsStore.totals.net, getDefaultCurrency()) }}
          </p>
        </Card>
      </div>

      <!-- Timeline de Cashflows -->
      <Card>
        <div v-if="cashflowsStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div
          v-else-if="filteredCashflows.length === 0"
          class="text-center py-12 text-text-secondary"
        >
          <p class="text-lg mb-4">No hay cashflows registrados</p>
          <Button v-if="!hasActiveFilters" @click="handleCreateCashflow" variant="primary">
            Crear primer cashflow
          </Button>
        </div>

        <div v-else>
          <!-- Timeline -->
          <div class="space-y-4">
            <div
              v-for="cashflow in filteredCashflows"
              :key="cashflow.id"
              class="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-background-secondary transition-colors"
            >
              <!-- Indicador de tipo -->
              <div
                :class="[
                  'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                  getCashflowTypeColor(cashflow.type),
                ]"
              />

              <!-- Contenido -->
              <div class="flex-1">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <Badge :variant="getCashflowTypeVariant(cashflow.type)" size="sm">
                        {{ cashflowTypeLabel(cashflow.type) }}
                      </Badge>
                      <span class="text-text-secondary text-sm">
                        {{ cashflow.account?.name || 'Cuenta eliminada' }}
                      </span>
                    </div>
                    <p class="text-text-secondary text-sm">
                      {{ new Date(cashflow.date).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p
                      :class="[
                        'text-xl font-bold mono-number',
                        getCashflowAmountClass(cashflow.type),
                      ]"
                    >
                      {{ formatCurrency(cashflow.amount, cashflow.currency) }}
                    </p>
                    <p v-if="cashflow.category" class="text-text-secondary text-sm mt-1">
                      {{ cashflow.category }}
                    </p>
                  </div>
                </div>
                <p v-if="cashflow.description" class="text-text-secondary text-sm">
                  {{ cashflow.description }}
                </p>
              </div>

              <!-- Acciones -->
              <div class="flex gap-2 flex-shrink-0">
                <button
                  class="px-2 py-1 text-sm text-info hover:text-info-dark transition-colors"
                  @click="handleEditCashflow(cashflow.id)"
                >
                  Editar
                </button>
                <button
                  class="px-2 py-1 text-sm text-loss hover:text-loss-dark transition-colors"
                  @click="handleDeleteCashflow(cashflow.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <!-- Paginación -->
          <div
            v-if="cashflowsStore.pagination.totalPages > 1"
            class="flex justify-between items-center mt-6 pt-6 border-t border-border"
          >
            <p class="text-text-secondary text-sm">
              Mostrando {{ (cashflowsStore.pagination.page - 1) * cashflowsStore.pagination.limit + 1 }} -
              {{ Math.min(cashflowsStore.pagination.page * cashflowsStore.pagination.limit, cashflowsStore.pagination.total) }}
              de {{ cashflowsStore.pagination.total }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="secondary"
                :disabled="cashflowsStore.pagination.page === 1"
                @click="handlePreviousPage"
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                :disabled="cashflowsStore.pagination.page === cashflowsStore.pagination.totalPages"
                @click="handleNextPage"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCashflowsStore } from '@/stores/cashflows';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const router = useRouter();
const route = useRoute();
const cashflowsStore = useCashflowsStore();
const accountsStore = useAccountsStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const filters = ref({
  accountId: '',
  type: '',
  startDate: '',
  endDate: '',
});

// Aplicar filtro de cuenta desde query params si existe
if (route.query.accountId) {
  filters.value.accountId = route.query.accountId as string;
}

const hasActiveFilters = computed(() => {
  return (
    filters.value.accountId ||
    filters.value.type ||
    filters.value.startDate ||
    filters.value.endDate ||
    searchQuery.value
  );
});

const filteredCashflows = computed(() => {
  let result = cashflowsStore.cashflows;

  // Búsqueda por descripción
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (cf) => cf.description?.toLowerCase().includes(query) || false
    );
  }

  return result;
});

const handleApplyFilters = async () => {
  await cashflowsStore.fetchCashflows({
    accountId: filters.value.accountId || undefined,
    type: (filters.value.type as any) || undefined,
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined,
    page: 1,
  });
};

const handleClearFilters = async () => {
  filters.value = {
    accountId: '',
    type: '',
    startDate: '',
    endDate: '',
  };
  searchQuery.value = '';
  cashflowsStore.clearFilters();
  await cashflowsStore.fetchCashflows({ page: 1 });
};

const handleCreateCashflow = () => {
  router.push({ name: 'CreateCashflow' });
};

const handleEditCashflow = (id: string) => {
  router.push({ name: 'EditCashflow', params: { id } });
};

const handleDeleteCashflow = async (id: string) => {
  if (!confirm('¿Estás seguro de que quieres eliminar este cashflow?')) {
    return;
  }

  try {
    await cashflowsStore.deleteCashflow(id);
    await cashflowsStore.fetchCashflows();
  } catch (error) {
    console.error('Error deleting cashflow:', error);
  }
};

const handlePreviousPage = async () => {
  const currentPage = cashflowsStore.pagination.page;
  if (currentPage > 1) {
    await cashflowsStore.fetchCashflows({ page: currentPage - 1 });
  }
};

const handleNextPage = async () => {
  const currentPage = cashflowsStore.pagination.page;
  const totalPages = cashflowsStore.pagination.totalPages;
  if (currentPage < totalPages) {
    await cashflowsStore.fetchCashflows({ page: currentPage + 1 });
  }
};

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

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
};

const getDefaultCurrency = () => {
  return authStore.user?.settings?.baseCurrency || 'USD';
};

const getCashflowTypeVariant = (
  type: string
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'success';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'danger';
  return 'default';
};

const getCashflowTypeColor = (type: string): string => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'bg-profit';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'bg-loss';
  return 'bg-text-secondary';
};

const getCashflowAmountClass = (type: string): string => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'text-profit';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'text-loss';
  return 'text-text';
};

// Lifecycle
onMounted(async () => {
  // Cargar cuentas si no están cargadas
  if (accountsStore.accounts.length === 0) {
    await accountsStore.fetchAccounts();
  }

  // Cargar cashflows
  await handleApplyFilters();
});
</script>


<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Cuentas</h1>
        <Button @click="handleCreateAccount" variant="primary">
          Nueva Cuenta
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
              placeholder="Buscar por nombre o broker..."
              class="mt-1"
            />
          </div>

          <!-- Filtro por tipo -->
          <div>
            <Label for="typeFilter">Tipo</Label>
            <Select
              id="typeFilter"
              v-model="filters.type"
              placeholder="Todos los tipos"
              class="mt-1"
            >
              <option value="">Todos los tipos</option>
              <option value="SPOT">Spot</option>
              <option value="MARGIN">Margin</option>
              <option value="FUTURES">Futures</option>
              <option value="CFD">CFD</option>
            </Select>
          </div>

          <!-- Filtro por estado -->
          <div>
            <Label for="statusFilter">Estado</Label>
            <Select
              id="statusFilter"
              v-model="filters.status"
              placeholder="Todos los estados"
              class="mt-1"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
              <option value="CLOSED">Cerrada</option>
            </Select>
          </div>
        </div>

        <!-- Filtro por moneda -->
        <div class="mt-4">
          <Label for="currencyFilter">Moneda</Label>
          <Select
            id="currencyFilter"
            v-model="filters.currency"
            placeholder="Todas las monedas"
            class="mt-1 max-w-xs"
          >
            <option value="">Todas las monedas</option>
            <option v-for="currency in uniqueCurrencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </Select>
        </div>
      </Card>

      <!-- Tabla de cuentas -->
      <Card>
        <div v-if="accountsStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="filteredAccounts.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            {{ searchQuery || hasFilters ? 'No se encontraron cuentas' : 'No hay cuentas registradas' }}
          </p>
          <Button v-if="!hasFilters" @click="handleCreateAccount" variant="primary">
            Crear primera cuenta
          </Button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th
                  v-for="column in columns"
                  :key="column.key"
                  class="text-left py-3 px-4 text-text-secondary text-sm font-medium cursor-pointer hover:text-text transition-colors"
                  @click="handleSort(column.key)"
                >
                  <div class="flex items-center gap-2">
                    {{ column.label }}
                    <span v-if="sortColumn === column.key" class="text-info">
                      {{ sortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="account in sortedAccounts"
                :key="account.id"
                class="border-b border-border hover:bg-background-secondary transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="font-medium">{{ account.name }}</div>
                  <div v-if="account.broker" class="text-sm text-text-secondary">
                    {{ account.broker }}
                  </div>
                </td>
                <td class="py-3 px-4">
                  <Badge variant="info" size="sm">{{ accountTypeLabel(account.type) }}</Badge>
                </td>
                <td class="py-3 px-4">
                  <Badge variant="default" size="sm">{{ account.currency }}</Badge>
                </td>
                <td class="py-3 px-4 mono-number">
                  {{ formatCurrency(account.currentBalance || 0, account.currency) }}
                </td>
                <td class="py-3 px-4 mono-number">
                  {{ formatCurrency(getAccountEquity(account), account.currency) }}
                </td>
                <td class="py-3 px-4">
                  <Badge
                    :variant="getDrawdownVariant(getAccountDrawdown(account))"
                    size="sm"
                  >
                    {{ formatDrawdown(getAccountDrawdown(account)) }}
                  </Badge>
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'mono-number',
                      getMonthlyReturnClass(getAccountMonthlyReturn(account)),
                    ]"
                  >
                    {{ formatMonthlyReturn(getAccountMonthlyReturn(account)) }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <Badge :variant="getStatusVariant(account.status)" size="sm">
                    {{ statusLabel(account.status) }}
                  </Badge>
                </td>
                <td class="py-3 px-4">
                  <div class="flex justify-end gap-2">
                    <button
                      class="px-2 py-1 text-sm text-info hover:text-info-dark transition-colors"
                      @click="handleViewAccount(account.id)"
                    >
                      Ver
                    </button>
                    <button
                      v-if="account.status === 'ACTIVE'"
                      class="px-2 py-1 text-sm text-text-secondary hover:text-text transition-colors"
                      @click="handleEditAccount(account.id)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="account.status === 'ACTIVE'"
                      class="px-2 py-1 text-sm text-loss hover:text-loss-dark transition-colors"
                      @click="handleCloseAccount(account.id)"
                    >
                      Cerrar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountsStore } from '@/stores/accounts';
import type { Account } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const router = useRouter();
const accountsStore = useAccountsStore();

// Estado local
const searchQuery = ref('');
const filters = ref({
  type: '',
  status: '',
  currency: '',
});
const sortColumn = ref<string | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');

// Columnas de la tabla
const columns = [
  { key: 'name', label: 'Nombre' },
  { key: 'type', label: 'Tipo' },
  { key: 'currency', label: 'Moneda' },
  { key: 'currentBalance', label: 'Balance' },
  { key: 'equity', label: 'Equity' },
  { key: 'drawdown', label: 'Drawdown' },
  { key: 'monthlyReturn', label: 'Rendimiento Mensual' },
  { key: 'status', label: 'Estado' },
];

// Computed
const uniqueCurrencies = computed(() => {
  const currencies = new Set(accountsStore.accounts.map((acc) => acc.currency));
  return Array.from(currencies).sort();
});

const hasFilters = computed(() => {
  return filters.value.type || filters.value.status || filters.value.currency;
});

const filteredAccounts = computed(() => {
  let result: Account[] = [...accountsStore.accounts];

  // Búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        (acc.broker && acc.broker.toLowerCase().includes(query))
    );
  }

  // Filtros
  if (filters.value.type) {
    result = result.filter((acc) => acc.type === filters.value.type);
  }
  if (filters.value.status) {
    result = result.filter((acc) => acc.status === filters.value.status);
  }
  if (filters.value.currency) {
    result = result.filter((acc) => acc.currency === filters.value.currency);
  }

  return result;
});

const sortedAccounts = computed(() => {
  if (!sortColumn.value) {
    return filteredAccounts.value;
  }

  const sorted = [...filteredAccounts.value];
  sorted.sort((a, b) => {
    let aValue: any = a[sortColumn.value as keyof Account];
    let bValue: any = b[sortColumn.value as keyof Account];

    // Valores especiales para ordenamiento
    if (sortColumn.value === 'currentBalance') {
      aValue = a.currentBalance || 0;
      bValue = b.currentBalance || 0;
    } else if (sortColumn.value === 'equity') {
      aValue = getAccountEquity(a);
      bValue = getAccountEquity(b);
    } else if (sortColumn.value === 'drawdown') {
      aValue = getAccountDrawdown(a);
      bValue = getAccountDrawdown(b);
    } else if (sortColumn.value === 'monthlyReturn') {
      aValue = getAccountMonthlyReturn(a);
      bValue = getAccountMonthlyReturn(b);
    }

    if (typeof aValue === 'string') {
      return sortDirection.value === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return sorted;
});

// Métodos
const handleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

const handleCreateAccount = () => {
  router.push({ name: 'CreateAccount' });
};

const handleViewAccount = (id: string) => {
  router.push({ name: 'AccountDetail', params: { id } });
};

const handleEditAccount = (id: string) => {
  router.push({ name: 'EditAccount', params: { id } });
};

const handleCloseAccount = async (id: string) => {
  if (!confirm('¿Estás seguro de que quieres cerrar esta cuenta?')) {
    return;
  }

  try {
    await accountsStore.closeAccount(id);
    await accountsStore.fetchAccounts();
  } catch (error) {
    console.error('Error al cerrar cuenta:', error);
  }
};

// Helpers
const accountTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    SPOT: 'Spot',
    MARGIN: 'Margin',
    FUTURES: 'Futures',
    CFD: 'CFD',
  };
  return labels[type] || type;
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ACTIVE: 'Activa',
    INACTIVE: 'Inactiva',
    CLOSED: 'Cerrada',
  };
  return labels[status] || status;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
};

const formatDrawdown = (dd: number) => {
  return `${dd.toFixed(2)}%`;
};

const formatMonthlyReturn = (returnValue?: number) => {
  if (returnValue === undefined) return 'N/A';
  return `${returnValue >= 0 ? '+' : ''}${returnValue.toFixed(2)}%`;
};

const getAccountEquity = (account: Account): number => {
  // Por ahora, equity = balance (hasta que haya trades)
  return account.currentBalance || 0;
};

const getAccountDrawdown = (account: Account): number => {
  // Por ahora retornar 0 (se calculará cuando haya snapshots)
  return 0;
};

const getAccountMonthlyReturn = (account: Account): number | undefined => {
  // Por ahora undefined (se calculará cuando haya snapshots)
  return undefined;
};

const getDrawdownVariant = (dd: number): 'default' | 'success' | 'warning' | 'danger' => {
  if (dd < 5) return 'success';
  if (dd < 15) return 'warning';
  return 'danger';
};

const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'INACTIVE') return 'warning';
  return 'default';
};

const getMonthlyReturnClass = (returnValue?: number): string => {
  if (returnValue === undefined) return 'text-text-secondary';
  if (returnValue > 0) return 'text-profit';
  if (returnValue < 0) return 'text-loss';
  return 'text-text-secondary';
};

// Lifecycle
onMounted(async () => {
  try {
    await accountsStore.fetchAccounts();
  } catch (error) {
    console.error('Error al cargar cuentas:', error);
  }
});
</script>


<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <button
            @click="$router.push({ name: 'Accounts' })"
            class="text-text-secondary hover:text-text mb-2 transition-colors"
          >
            ← Volver a cuentas
          </button>
          <h1 class="text-3xl font-bold">{{ account?.name || 'Cargando...' }}</h1>
        </div>
        <div class="flex gap-2" v-if="account">
          <Button
            v-if="account.status === 'ACTIVE'"
            variant="secondary"
            @click="handleEdit"
          >
            Editar
          </Button>
          <Button
            v-if="account.status === 'ACTIVE'"
            variant="danger"
            @click="handleClose"
          >
            Cerrar Cuenta
          </Button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>

      <!-- Error -->
      <Card v-else-if="error" class="mb-6">
        <div class="text-loss">{{ error }}</div>
        <Button @click="loadAccount" variant="primary" class="mt-4">
          Reintentar
        </Button>
      </Card>

      <!-- Content -->
      <div v-else-if="account">
        <!-- Información General -->
        <Card class="mb-6">
          <h2 class="text-xl font-bold mb-4">Información General</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <p class="text-text mt-1">{{ account.name }}</p>
            </div>
            <div v-if="account.broker">
              <Label>Broker/Exchange</Label>
              <p class="text-text mt-1">{{ account.broker }}</p>
            </div>
            <div>
              <Label>Tipo</Label>
              <div class="mt-1">
                <Badge variant="info" size="sm">{{ accountTypeLabel(account.type) }}</Badge>
              </div>
            </div>
            <div>
              <Label>Moneda</Label>
              <div class="mt-1">
                <Badge variant="default" size="sm">{{ account.currency }}</Badge>
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <div class="mt-1">
                <Badge :variant="getStatusVariant(account.status)" size="sm">
                  {{ statusLabel(account.status) }}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Fecha de Creación</Label>
              <p class="text-text-secondary mt-1">
                {{ new Date(account.createdAt).toLocaleDateString('es-CO') }}
              </p>
            </div>
            <div v-if="account.notes" class="md:col-span-2">
              <Label>Notas</Label>
              <p class="text-text-secondary mt-1">{{ account.notes }}</p>
            </div>
          </div>
        </Card>

        <!-- Métricas -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <Label>Balance Actual</Label>
            <p class="text-2xl font-bold mono-number mt-2">
              {{ formatCurrency(account.currentBalance || 0, account.currency) }}
            </p>
          </Card>
          <Card>
            <Label>Equity</Label>
            <p class="text-2xl font-bold mono-number mt-2">
              {{ formatCurrency(account.equity, account.currency) }}
            </p>
          </Card>
          <Card>
            <Label>Drawdown</Label>
            <div class="mt-2">
              <Badge
                :variant="getDrawdownVariant(account.drawdown)"
                size="md"
                class="text-lg"
              >
                {{ formatDrawdown(account.drawdown) }}
              </Badge>
            </div>
          </Card>
          <Card>
            <Label>Rendimiento Mensual</Label>
            <p
              :class="[
                'text-2xl font-bold mono-number mt-2',
                getMonthlyReturnClass(account.monthlyReturn),
              ]"
            >
              {{ formatMonthlyReturn(account.monthlyReturn) }}
            </p>
          </Card>
          <Card>
            <Label>Total Cashflows</Label>
            <p class="text-2xl font-bold mono-number mt-2">
              {{ formatCurrency(account.totalCashflows, account.currency) }}
            </p>
          </Card>
          <Card>
            <Label>PnL Realizado</Label>
            <p
              :class="[
                'text-2xl font-bold mono-number mt-2',
                account.totalRealizedPnL >= 0 ? 'text-profit' : 'text-loss',
              ]"
            >
              {{ formatCurrency(account.totalRealizedPnL, account.currency) }}
            </p>
          </Card>
        </div>

        <!-- Equity Curve -->
        <Card class="mb-6" v-if="snapshots.length > 0">
          <h2 class="text-xl font-bold mb-4">Equity Curve</h2>
          <EquityChart :snapshots="snapshots" :currency="account.currency" />
        </Card>

        <!-- Cashflows Recientes -->
        <Card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Cashflows Recientes</h2>
            <Button variant="ghost" @click="handleViewAllCashflows">
              Ver todos
            </Button>
          </div>
          <div v-if="recentCashflows.length === 0" class="text-center py-8 text-text-secondary">
            No hay cashflows registrados
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                    Fecha
                  </th>
                  <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                    Tipo
                  </th>
                  <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                    Monto
                  </th>
                  <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="cashflow in recentCashflows"
                  :key="cashflow.id"
                  class="border-b border-border hover:bg-background-secondary transition-colors"
                >
                  <td class="py-3 px-4">
                    {{ new Date(cashflow.date).toLocaleDateString('es-CO') }}
                  </td>
                  <td class="py-3 px-4">
                    <Badge :variant="getCashflowTypeVariant(cashflow.type)" size="sm">
                      {{ cashflowTypeLabel(cashflow.type) }}
                    </Badge>
                  </td>
                  <td
                    :class="[
                      'py-3 px-4 mono-number font-medium',
                      getCashflowAmountClass(cashflow.type),
                    ]"
                  >
                    {{ formatCurrency(cashflow.amount, cashflow.currency) }}
                  </td>
                  <td class="py-3 px-4 text-text-secondary">
                    {{ cashflow.description || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountsStore } from '@/stores/accounts';
import { api } from '@/services/api';
import type { AccountDetail, Cashflow, AccountSnapshot } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Label from '@/components/ui/Label.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import EquityChart from '@/components/charts/EquityChart.vue';

const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();

const account = ref<AccountDetail | null>(null);
const recentCashflows = ref<Cashflow[]>([]);
const snapshots = ref<AccountSnapshot[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadAccount = async () => {
  const accountId = route.params.id as string;
  loading.value = true;
  error.value = null;

  try {
    // Cargar detalles de la cuenta
    account.value = await accountsStore.fetchAccountDetails(accountId);

    // Cargar cashflows recientes
    const cashflowsResponse = await api.get<{ data: Cashflow[] }>('/cashflows', {
      params: {
        accountId,
        limit: 10,
        page: 1,
      },
    });
    recentCashflows.value = cashflowsResponse.data.data;

    // Cargar snapshots para el gráfico (desde el endpoint de snapshots o desde la cuenta)
    // Por ahora, intentamos obtener snapshots desde la cuenta si están disponibles
    // TODO: Crear endpoint específico para obtener snapshots de una cuenta
    try {
      // Intentar obtener snapshots desde algún endpoint futuro
      // Por ahora, creamos snapshots vacíos
      snapshots.value = [];
    } catch (e) {
      // Si no hay endpoint de snapshots, usar datos vacíos
      snapshots.value = [];
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al cargar la cuenta';
    console.error('Error loading account:', err);
  } finally {
    loading.value = false;
  }
};

const handleEdit = () => {
  router.push({ name: 'EditAccount', params: { id: account.value?.id } });
};

const handleClose = async () => {
  if (!account.value) return;
  if (!confirm('¿Estás seguro de que quieres cerrar esta cuenta?')) {
    return;
  }

  try {
    await accountsStore.closeAccount(account.value.id);
    await loadAccount();
  } catch (err) {
    console.error('Error closing account:', err);
  }
};

const handleViewAllCashflows = () => {
  router.push({
    name: 'Cashflows',
    query: { accountId: account.value?.id },
  });
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

const formatDrawdown = (dd: number) => {
  return `${dd.toFixed(2)}%`;
};

const formatMonthlyReturn = (returnValue?: number) => {
  if (returnValue === undefined) return 'N/A';
  return `${returnValue >= 0 ? '+' : ''}${returnValue.toFixed(2)}%`;
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

const getCashflowTypeVariant = (
  type: string
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'success';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'danger';
  return 'default';
};

const getCashflowAmountClass = (type: string): string => {
  if (type === 'DEPOSIT' || type === 'ADJUSTMENT') return 'text-profit';
  if (type === 'WITHDRAWAL' || type === 'FEE') return 'text-loss';
  return 'text-text';
};

const getMonthlyReturnClass = (returnValue?: number): string => {
  if (returnValue === undefined) return 'text-text-secondary';
  if (returnValue > 0) return 'text-profit';
  if (returnValue < 0) return 'text-loss';
  return 'text-text-secondary';
};

onMounted(() => {
  loadAccount();
});
</script>

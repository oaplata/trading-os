import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Cashflow } from '@/types';
import { api } from '@/services/api';

interface CashflowFilters {
  accountId?: string;
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'FEE';
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: number;
  limit?: number;
}

interface CashflowTotals {
  deposits: number;
  withdrawals: number;
  adjustments: number;
  fees: number;
  net: number;
}

export const useCashflowsStore = defineStore('cashflows', () => {
  const cashflows = ref<Cashflow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<CashflowFilters>({
    page: 1,
    limit: 50,
  });
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  // Getters
  const filteredCashflows = computed(() => cashflows.value);

  const depositsTotal = computed(() => {
    return cashflows.value
      .filter((cf) => cf.type === 'DEPOSIT' || cf.type === 'ADJUSTMENT')
      .reduce((sum, cf) => sum + cf.amount, 0);
  });

  const withdrawalsTotal = computed(() => {
    return cashflows.value
      .filter((cf) => cf.type === 'WITHDRAWAL' || cf.type === 'FEE')
      .reduce((sum, cf) => sum + cf.amount, 0);
  });

  const netTotal = computed(() => {
    return depositsTotal.value - withdrawalsTotal.value;
  });

  const totals = computed<CashflowTotals>(() => {
    const deposits = cashflows.value
      .filter((cf) => cf.type === 'DEPOSIT')
      .reduce((sum, cf) => sum + cf.amount, 0);
    const withdrawals = cashflows.value
      .filter((cf) => cf.type === 'WITHDRAWAL')
      .reduce((sum, cf) => sum + cf.amount, 0);
    const adjustments = cashflows.value
      .filter((cf) => cf.type === 'ADJUSTMENT')
      .reduce((sum, cf) => sum + cf.amount, 0);
    const fees = cashflows.value
      .filter((cf) => cf.type === 'FEE')
      .reduce((sum, cf) => sum + cf.amount, 0);

    return {
      deposits,
      withdrawals,
      adjustments,
      fees,
      net: deposits + adjustments - withdrawals - fees,
    };
  });

  // Actions
  const fetchCashflows = async (newFilters?: Partial<CashflowFilters>) => {
    loading.value = true;
    error.value = null;

    if (newFilters) {
      filters.value = { ...filters.value, ...newFilters };
    }

    try {
      const params: Record<string, any> = {
        page: filters.value.page || 1,
        limit: filters.value.limit || 50,
      };

      if (filters.value.accountId) params.accountId = filters.value.accountId;
      if (filters.value.type) params.type = filters.value.type;
      if (filters.value.startDate) params.startDate = filters.value.startDate;
      if (filters.value.endDate) params.endDate = filters.value.endDate;
      if (filters.value.category) params.category = filters.value.category;

      const response = await api.get<{ data: Cashflow[]; meta: any }>('/cashflows', { params });
      cashflows.value = response.data.data;
      pagination.value = response.data.meta;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener cashflows';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createCashflow = async (data: {
    accountId: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'FEE';
    amount: number;
    currency: string;
    description?: string;
    date?: string;
    category?: string;
  }) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<Cashflow>('/cashflows', data);
      cashflows.value.unshift(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear cashflow';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCashflow = async (id: string, data: Partial<Cashflow>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.patch<Cashflow>(`/cashflows/${id}`, data);
      const index = cashflows.value.findIndex((cf) => cf.id === id);
      if (index !== -1) {
        cashflows.value[index] = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar cashflow';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCashflow = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/cashflows/${id}`);
      cashflows.value = cashflows.value.filter((cf) => cf.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar cashflow';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getTotals = async () => {
    // Los totales se calculan desde los cashflows cargados
    // Si necesitamos totales de todos los cashflows (no solo los cargados),
    // necesitaríamos un endpoint específico
    return totals.value;
  };

  const clearFilters = () => {
    filters.value = {
      page: 1,
      limit: 50,
    };
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    cashflows,
    loading,
    error,
    filters,
    pagination,
    // Getters
    filteredCashflows,
    depositsTotal,
    withdrawalsTotal,
    netTotal,
    totals,
    // Actions
    fetchCashflows,
    createCashflow,
    updateCashflow,
    deleteCashflow,
    getTotals,
    clearFilters,
    clearError,
  };
});


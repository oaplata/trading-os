import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Trade,
  CreateTradeDto,
  UpdateTradeDto,
  TradeListQuery,
  PaginatedTrades,
  CloseTradeDto,
} from '@/types';
import { api } from '@/services/api';

export const useTradesStore = defineStore('trades', () => {
  const trades = ref<Trade[]>([]);
  const selectedTrade = ref<Trade | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<TradeListQuery>({
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
  const openTrades = computed(() =>
    trades.value.filter((trade) => trade.status === 'OPEN')
  );

  const closedTrades = computed(() =>
    trades.value.filter((trade) => trade.status === 'CLOSED')
  );

  const plannedTrades = computed(() =>
    trades.value.filter((trade) => trade.status === 'PLANNED')
  );

  const tradesByAccount = computed(() => {
    const grouped: Record<string, Trade[]> = {};
    trades.value.forEach((trade) => {
      const accountId = trade.accountId;
      if (!grouped[accountId]) {
        grouped[accountId] = [];
      }
      grouped[accountId].push(trade);
    });
    return grouped;
  });

  const tradesByStrategy = computed(() => {
    const grouped: Record<string, Trade[]> = {};
    trades.value.forEach((trade) => {
      const strategyId = trade.strategyId || 'Sin estrategia';
      if (!grouped[strategyId]) {
        grouped[strategyId] = [];
      }
      grouped[strategyId].push(trade);
    });
    return grouped;
  });

  // Actions
  const fetchTrades = async (newFilters?: Partial<TradeListQuery>) => {
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
      if (filters.value.instrumentId) params.instrumentId = filters.value.instrumentId;
      if (filters.value.strategyId) params.strategyId = filters.value.strategyId;
      if (filters.value.setupId) params.setupId = filters.value.setupId;
      if (filters.value.status) params.status = filters.value.status;
      if (filters.value.side) params.side = filters.value.side;
      if (filters.value.result) params.result = filters.value.result;
      if (filters.value.tags && filters.value.tags.length > 0) {
        params.tags = filters.value.tags;
      }
      if (filters.value.dateFrom) params.dateFrom = filters.value.dateFrom;
      if (filters.value.dateTo) params.dateTo = filters.value.dateTo;
      if (filters.value.search) params.search = filters.value.search;

      const response = await api.get<PaginatedTrades>('/trades', { params });
      trades.value = response.data.data;
      pagination.value = response.data.meta;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener trades';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTrade = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Trade>(`/trades/${id}`);
      selectedTrade.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTrade = async (dto: CreateTradeDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Trade>('/trades', dto);
      trades.value.unshift(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTrade = async (id: string, dto: UpdateTradeDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Trade>(`/trades/${id}`, dto);
      const index = trades.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        trades.value[index] = response.data;
      }
      if (selectedTrade.value?.id === id) {
        selectedTrade.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const openTrade = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Trade>(`/trades/${id}/open`);
      const index = trades.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        trades.value[index] = response.data;
      }
      if (selectedTrade.value?.id === id) {
        selectedTrade.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al abrir trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const closeTrade = async (id: string, dto: CloseTradeDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Trade>(`/trades/${id}/close`, dto);
      const index = trades.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        trades.value[index] = response.data;
      }
      if (selectedTrade.value?.id === id) {
        selectedTrade.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al cerrar trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const cancelTrade = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Trade>(`/trades/${id}/cancel`);
      const index = trades.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        trades.value[index] = response.data;
      }
      if (selectedTrade.value?.id === id) {
        selectedTrade.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al cancelar trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const duplicateTrade = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Trade>(`/trades/${id}/duplicate`);
      trades.value.unshift(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al duplicar trade';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetFilters = () => {
    filters.value = {
      page: 1,
      limit: 50,
    };
  };

  return {
    // State
    trades,
    selectedTrade,
    loading,
    error,
    filters,
    pagination,
    // Getters
    openTrades,
    closedTrades,
    plannedTrades,
    tradesByAccount,
    tradesByStrategy,
    // Actions
    fetchTrades,
    fetchTrade,
    createTrade,
    updateTrade,
    openTrade,
    closeTrade,
    cancelTrade,
    duplicateTrade,
    resetFilters,
  };
});


import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Strategy,
  CreateStrategyDto,
  UpdateStrategyDto,
  StrategyListQuery,
  PaginatedStrategies,
} from '@/types';
import { api } from '@/services/api';

export const useStrategiesStore = defineStore('strategies', () => {
  const strategies = ref<Strategy[]>([]);
  const selectedStrategy = ref<Strategy | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<StrategyListQuery>({
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
  const activeStrategies = computed(() =>
    strategies.value.filter((strategy) => strategy.isActive)
  );

  const strategiesByMarket = computed(() => {
    const grouped: Record<string, Strategy[]> = {};
    strategies.value.forEach((strategy) => {
      const market = strategy.targetMarket || 'Sin mercado';
      if (!grouped[market]) {
        grouped[market] = [];
      }
      grouped[market].push(strategy);
    });
    return grouped;
  });

  // Actions
  const fetchStrategies = async (newFilters?: Partial<StrategyListQuery>) => {
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

      if (filters.value.targetMarket) params.targetMarket = filters.value.targetMarket;
      if (filters.value.search) params.search = filters.value.search;
      if (filters.value.isActive !== undefined) params.isActive = filters.value.isActive;

      const response = await api.get<PaginatedStrategies>('/strategies', { params });
      strategies.value = response.data.data;
      pagination.value = response.data.meta;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener estrategias';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchStrategy = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Strategy>(`/strategies/${id}`);
      selectedStrategy.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener estrategia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createStrategy = async (dto: CreateStrategyDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Strategy>('/strategies', dto);
      strategies.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear estrategia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateStrategy = async (id: string, dto: UpdateStrategyDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Strategy>(`/strategies/${id}`, dto);
      const index = strategies.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        strategies.value[index] = response.data;
      }
      if (selectedStrategy.value?.id === id) {
        selectedStrategy.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar estrategia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteStrategy = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/strategies/${id}`);
      strategies.value = strategies.value.filter((s) => s.id !== id);
      if (selectedStrategy.value?.id === id) {
        selectedStrategy.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar estrategia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    strategies,
    selectedStrategy,
    loading,
    error,
    filters,
    pagination,
    // Getters
    activeStrategies,
    strategiesByMarket,
    // Actions
    fetchStrategies,
    fetchStrategy,
    createStrategy,
    updateStrategy,
    deleteStrategy,
  };
});


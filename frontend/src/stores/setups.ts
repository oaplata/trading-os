import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Setup,
  CreateSetupDto,
  UpdateSetupDto,
  SetupListQuery,
  PaginatedSetups,
} from '@/types';
import { api } from '@/services/api';

export const useSetupsStore = defineStore('setups', () => {
  const setups = ref<Setup[]>([]);
  const selectedSetup = ref<Setup | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<SetupListQuery>({
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
  const activeSetups = computed(() =>
    setups.value.filter((setup) => setup.isActive)
  );

  const setupsByStrategy = computed(() => {
    const grouped: Record<string, Setup[]> = {};
    setups.value.forEach((setup) => {
      const strategyId = setup.strategyId || 'sin-estrategia';
      if (!grouped[strategyId]) {
        grouped[strategyId] = [];
      }
      grouped[strategyId].push(setup);
    });
    return grouped;
  });

  // Actions
  const fetchSetups = async (newFilters?: Partial<SetupListQuery>) => {
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

      if (filters.value.strategyId) params.strategyId = filters.value.strategyId;
      if (filters.value.search) params.search = filters.value.search;
      if (filters.value.isActive !== undefined) params.isActive = filters.value.isActive;

      const response = await api.get<PaginatedSetups>('/setups', { params });
      setups.value = response.data.data;
      pagination.value = response.data.meta;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener setups';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSetup = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Setup>(`/setups/${id}`);
      selectedSetup.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener setup';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSetupsByStrategy = async (strategyId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Setup[]>(`/setups/strategy/${strategyId}`);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener setups de la estrategia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createSetup = async (dto: CreateSetupDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Setup>('/setups', dto);
      setups.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear setup';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSetup = async (id: string, dto: UpdateSetupDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Setup>(`/setups/${id}`, dto);
      const index = setups.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        setups.value[index] = response.data;
      }
      if (selectedSetup.value?.id === id) {
        selectedSetup.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar setup';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSetup = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/setups/${id}`);
      setups.value = setups.value.filter((s) => s.id !== id);
      if (selectedSetup.value?.id === id) {
        selectedSetup.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar setup';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    setups,
    selectedSetup,
    loading,
    error,
    filters,
    pagination,
    // Getters
    activeSetups,
    setupsByStrategy,
    // Actions
    fetchSetups,
    fetchSetup,
    fetchSetupsByStrategy,
    createSetup,
    updateSetup,
    deleteSetup,
  };
});


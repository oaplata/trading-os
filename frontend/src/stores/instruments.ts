import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Instrument,
  CreateInstrumentDto,
  UpdateInstrumentDto,
  InstrumentListQuery,
  PaginatedInstruments,
} from '@/types';
import { api } from '@/services/api';

export const useInstrumentsStore = defineStore('instruments', () => {
  const instruments = ref<Instrument[]>([]);
  const selectedInstrument = ref<Instrument | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<InstrumentListQuery>({
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
  const activeInstruments = computed(() =>
    instruments.value.filter((instrument) => instrument.isActive)
  );

  const instrumentsByType = computed(() => {
    const grouped: Record<string, Instrument[]> = {};
    instruments.value.forEach((instrument) => {
      if (!grouped[instrument.type]) {
        grouped[instrument.type] = [];
      }
      grouped[instrument.type].push(instrument);
    });
    return grouped;
  });

  const instrumentsByMarket = computed(() => {
    const grouped: Record<string, Instrument[]> = {};
    instruments.value.forEach((instrument) => {
      if (!grouped[instrument.market]) {
        grouped[instrument.market] = [];
      }
      grouped[instrument.market].push(instrument);
    });
    return grouped;
  });

  const filteredInstruments = computed(() => instruments.value);

  // Actions
  const fetchInstruments = async (newFilters?: Partial<InstrumentListQuery>) => {
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

      if (filters.value.market) params.market = filters.value.market;
      if (filters.value.type) params.type = filters.value.type;
      if (filters.value.search) params.search = filters.value.search;
      if (filters.value.isActive !== undefined) params.isActive = filters.value.isActive;

      const response = await api.get<PaginatedInstruments>('/instruments', { params });
      instruments.value = response.data.data;
      pagination.value = response.data.meta;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener instrumentos';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const searchInstruments = async (query: string, limit: number = 10) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const response = await api.get<Instrument[]>('/instruments/search', {
        params: { q: query, limit },
      });
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al buscar instrumentos';
      throw err;
    }
  };

  const fetchInstrument = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get<Instrument>(`/instruments/${id}`);
      selectedInstrument.value = response.data;
      // Actualizar también en la lista si existe
      const index = instruments.value.findIndex((inst) => inst.id === id);
      if (index !== -1) {
        instruments.value[index] = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener el instrumento';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const findByTicker = async (ticker: string) => {
    try {
      const response = await api.get<Instrument>(`/instruments/ticker/${encodeURIComponent(ticker)}`);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al buscar instrumento por ticker';
      throw err;
    }
  };

  const createInstrument = async (data: CreateInstrumentDto) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<Instrument>('/instruments', data);
      instruments.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear instrumento';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateInstrument = async (id: string, data: UpdateInstrumentDto) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.patch<Instrument>(`/instruments/${id}`, data);
      const index = instruments.value.findIndex((inst) => inst.id === id);
      if (index !== -1) {
        instruments.value[index] = response.data;
      }
      // Si es el instrumento seleccionado, actualizarlo también
      if (selectedInstrument.value?.id === id) {
        selectedInstrument.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar instrumento';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteInstrument = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/instruments/${id}`);
      // Actualizar el estado a inactivo en la lista local
      const index = instruments.value.findIndex((inst) => inst.id === id);
      if (index !== -1) {
        instruments.value[index].isActive = false;
      }
      if (selectedInstrument.value?.id === id) {
        selectedInstrument.value.isActive = false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar instrumento';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Helpers
  const clearSelectedInstrument = () => {
    selectedInstrument.value = null;
  };

  const clearFilters = () => {
    filters.value = { page: 1, limit: 50 };
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    instruments,
    selectedInstrument,
    loading,
    error,
    filters,
    pagination,
    // Getters
    activeInstruments,
    instrumentsByType,
    instrumentsByMarket,
    filteredInstruments,
    // Actions
    fetchInstruments,
    searchInstruments,
    fetchInstrument,
    findByTicker,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    // Helpers
    clearSelectedInstrument,
    clearFilters,
    clearError,
  };
});


import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Fill, CreateFillDto, UpdateFillDto } from '@/types';
import { api } from '@/services/api';

export const useFillsStore = defineStore('fills', () => {
  const fills = ref<Fill[]>([]);
  const selectedFill = ref<Fill | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  const fetchFillsByTrade = async (tradeId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Fill[]>(`/fills/trade/${tradeId}`);
      fills.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener fills';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchFill = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Fill>(`/fills/${id}`);
      selectedFill.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener fill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createFill = async (dto: CreateFillDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Fill>('/fills', dto);
      fills.value.push(response.data);
      fills.value.sort((a, b) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear fill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateFill = async (id: string, dto: UpdateFillDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Fill>(`/fills/${id}`, dto);
      const index = fills.value.findIndex((f) => f.id === id);
      if (index !== -1) {
        fills.value[index] = response.data;
      }
      if (selectedFill.value?.id === id) {
        selectedFill.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar fill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteFill = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/fills/${id}`);
      fills.value = fills.value.filter((f) => f.id !== id);
      if (selectedFill.value?.id === id) {
        selectedFill.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar fill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    fills,
    selectedFill,
    loading,
    error,
    // Actions
    fetchFillsByTrade,
    fetchFill,
    createFill,
    updateFill,
    deleteFill,
  };
});


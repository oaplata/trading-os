import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChecklistItem, UpdateChecklistDto } from '@/types';
import { api } from '@/services/api';

export const useTradeChecklistStore = defineStore('trade-checklist', () => {
  const checklist = ref<ChecklistItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  const fetchChecklist = async (tradeId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<ChecklistItem[]>(`/trades/${tradeId}/checklist`);
      checklist.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener checklist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateChecklist = async (tradeId: string, dto: UpdateChecklistDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<ChecklistItem[]>(`/trades/${tradeId}/checklist`, dto);
      checklist.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar checklist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    checklist,
    loading,
    error,
    // Actions
    fetchChecklist,
    updateChecklist,
  };
});


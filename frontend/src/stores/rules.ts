import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Rule,
  CreateRuleDto,
  UpdateRuleDto,
  RuleListQuery,
  ReorderRulesDto,
} from '@/types';
import { api } from '@/services/api';

export const useRulesStore = defineStore('rules', () => {
  const rules = ref<Rule[]>([]);
  const selectedRule = ref<Rule | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeRules = computed(() =>
    rules.value.filter((rule) => rule.isActive)
  );

  const rulesBySetup = computed(() => {
    const grouped: Record<string, Rule[]> = {};
    rules.value.forEach((rule) => {
      if (!grouped[rule.setupId]) {
        grouped[rule.setupId] = [];
      }
      grouped[rule.setupId].push(rule);
    });
    // Ordenar por order y luego por createdAt
    Object.keys(grouped).forEach((setupId) => {
      grouped[setupId].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    });
    return grouped;
  });

  const requiredRules = computed(() =>
    rules.value.filter((rule) => rule.isRequired)
  );

  // Actions
  const fetchRules = async (query?: RuleListQuery) => {
    loading.value = true;
    error.value = null;

    try {
      const params: Record<string, any> = {};
      if (query?.setupId) params.setupId = query.setupId;
      if (query?.isRequired !== undefined) params.isRequired = query.isRequired;
      if (query?.isActive !== undefined) params.isActive = query.isActive;

      const response = await api.get<Rule[]>('/rules', { params });
      rules.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener reglas';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRule = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Rule>(`/rules/${id}`);
      selectedRule.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener regla';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRulesBySetup = async (setupId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get<Rule[]>(`/rules/setup/${setupId}`);
      // Actualizar reglas en el store
      const existingRules = rules.value.filter((r) => r.setupId !== setupId);
      rules.value = [...existingRules, ...response.data];
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener reglas del setup';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRule = async (dto: CreateRuleDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<Rule>('/rules', dto);
      rules.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear regla';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRule = async (id: string, dto: UpdateRuleDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Rule>(`/rules/${id}`, dto);
      const index = rules.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        rules.value[index] = response.data;
      }
      if (selectedRule.value?.id === id) {
        selectedRule.value = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar regla';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRule = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/rules/${id}`);
      rules.value = rules.value.filter((r) => r.id !== id);
      if (selectedRule.value?.id === id) {
        selectedRule.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar regla';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reorderRules = async (dto: ReorderRulesDto) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch<Rule[]>('/rules/reorder', dto);
      // Actualizar reglas del setup en el store
      const existingRules = rules.value.filter((r) => r.setupId !== dto.setupId);
      rules.value = [...existingRules, ...response.data];
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al reordenar reglas';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    rules,
    selectedRule,
    loading,
    error,
    // Getters
    activeRules,
    rulesBySetup,
    requiredRules,
    // Actions
    fetchRules,
    fetchRule,
    fetchRulesBySetup,
    createRule,
    updateRule,
    deleteRule,
    reorderRules,
  };
});


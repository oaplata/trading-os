import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Account, AccountDetail, CreateAccountDto, UpdateAccountDto } from '@/types';
import { api } from '@/services/api';

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([]);
  const selectedAccount = ref<AccountDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeAccounts = computed(() =>
    accounts.value.filter((account) => account.status === 'ACTIVE')
  );

  const accountsByCurrency = computed(() => {
    const grouped: Record<string, Account[]> = {};
    accounts.value.forEach((account) => {
      if (!grouped[account.currency]) {
        grouped[account.currency] = [];
      }
      grouped[account.currency].push(account);
    });
    return grouped;
  });

  const accountsByType = computed(() => {
    const grouped: Record<string, Account[]> = {};
    accounts.value.forEach((account) => {
      if (!grouped[account.type]) {
        grouped[account.type] = [];
      }
      grouped[account.type].push(account);
    });
    return grouped;
  });

  // Actions
  const fetchAccounts = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get<Account[]>('/accounts');
      accounts.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener cuentas';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAccountDetails = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get<AccountDetail>(`/accounts/${id}`);
      selectedAccount.value = response.data;
      // Actualizar también en la lista si existe
      const index = accounts.value.findIndex((acc) => acc.id === id);
      if (index !== -1) {
        accounts.value[index] = { ...accounts.value[index], ...response.data };
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al obtener detalles de la cuenta';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createAccount = async (data: CreateAccountDto) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<Account>('/accounts', data);
      accounts.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al crear cuenta';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateAccount = async (id: string, data: UpdateAccountDto) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.patch<Account>(`/accounts/${id}`, data);
      const index = accounts.value.findIndex((acc) => acc.id === id);
      if (index !== -1) {
        accounts.value[index] = response.data;
      }
      // Si es la cuenta seleccionada, actualizarla también
      if (selectedAccount.value?.id === id) {
        selectedAccount.value = { ...selectedAccount.value, ...response.data };
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar cuenta';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const closeAccount = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.delete<Account>(`/accounts/${id}`);
      const index = accounts.value.findIndex((acc) => acc.id === id);
      if (index !== -1) {
        accounts.value[index] = response.data;
      }
      // Si es la cuenta seleccionada, actualizarla también
      if (selectedAccount.value?.id === id) {
        selectedAccount.value = { ...selectedAccount.value, ...response.data };
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al cerrar cuenta';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearSelectedAccount = () => {
    selectedAccount.value = null;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    accounts,
    selectedAccount,
    loading,
    error,
    // Getters
    activeAccounts,
    accountsByCurrency,
    accountsByType,
    // Actions
    fetchAccounts,
    fetchAccountDetails,
    createAccount,
    updateAccount,
    closeAccount,
    clearSelectedAccount,
    clearError,
  };
});


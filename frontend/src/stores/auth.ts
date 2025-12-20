import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserSettings } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  const userEmail = computed(() => user.value?.email || null);

  // Inicializar desde localStorage
  const init = () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;
      user.value = JSON.parse(storedUser);
    }
  };

  // Actions
  const register = async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password });
    setAuthData(response.data);
    return response.data;
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    setAuthData(response.data);
    return response.data;
  };

  const logout = () => {
    if (refreshToken.value) {
      // Llamar al endpoint de logout (opcional, puede fallar si el token ya expiró)
      api.post('/auth/logout', { refreshToken: refreshToken.value }).catch(() => {
        // Ignorar errores en logout
      });
    }
    clearAuthData();
  };

  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (token: string, password: string) => {
    await api.post('/auth/reset-password', { token, password });
  };

  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post('/auth/refresh', {
        refreshToken: refreshToken.value,
      });
      setAuthData(response.data);
      return response.data;
    } catch (error) {
      // Si el refresh falla, hacer logout
      clearAuthData();
      throw error;
    }
  };

  const fetchUser = async () => {
    const response = await api.get('/users/me');
    user.value = response.data;
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  };

  const updateSettings = async (settings: Partial<UserSettings>) => {
    const response = await api.patch('/users/me/settings', settings);
    if (user.value) {
      user.value.settings = { ...user.value.settings, ...response.data };
      localStorage.setItem('user', JSON.stringify(user.value));
    }
    return response.data;
  };

  // Helpers
  const setAuthData = (data: { accessToken: string; refreshToken: string; user: User }) => {
    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;
    user.value = data.user;

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const clearAuthData = () => {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  return {
    // State
    user,
    accessToken,
    refreshToken,
    // Getters
    isAuthenticated,
    userEmail,
    // Actions
    init,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    fetchUser,
    updateSettings,
  };
});


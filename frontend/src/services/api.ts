import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Agregar token a las requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore();
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Manejar refresh token automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const authStore = useAuthStore();

      try {
        // Intentar refrescar el token
        await authStore.refreshAccessToken();

        // Reintentar la request original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh falla, hacer logout y redirigir a login
        authStore.logout();
        router.push({ name: 'Login' });
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;


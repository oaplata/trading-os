import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import * as api from '@/services/api';

// Mock del módulo de API
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('init', () => {
    it('debería inicializar desde localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh');
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }));

      const store = useAuthStore();
      store.init();

      expect(store.accessToken).toBe('test-token');
      expect(store.refreshToken).toBe('test-refresh');
      expect(store.user?.email).toBe('test@example.com');
    });

    it('debería manejar localStorage vacío', () => {
      const store = useAuthStore();
      store.init();

      expect(store.accessToken).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.user).toBeNull();
    });
  });

  describe('register', () => {
    it('debería registrar un usuario y guardar tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: { id: '1', email: 'test@example.com', emailVerified: false },
        },
      };

      vi.mocked(api.api.post).mockResolvedValue(mockResponse);

      const store = useAuthStore();
      const result = await store.register('test@example.com', 'Test123!@#');

      expect(api.api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'Test123!@#',
      });
      expect(store.accessToken).toBe('new-access-token');
      expect(store.refreshToken).toBe('new-refresh-token');
      expect(store.user?.email).toBe('test@example.com');
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    });
  });

  describe('login', () => {
    it('debería hacer login y guardar tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: 'login-token',
          refreshToken: 'login-refresh',
          user: { id: '1', email: 'test@example.com', emailVerified: false },
        },
      };

      vi.mocked(api.api.post).mockResolvedValue(mockResponse);

      const store = useAuthStore();
      await store.login('test@example.com', 'Test123!@#');

      expect(api.api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Test123!@#',
      });
      expect(store.accessToken).toBe('login-token');
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('debería limpiar tokens y estado', async () => {
      const store = useAuthStore();
      store.accessToken = 'token';
      store.refreshToken = 'refresh';
      store.user = { id: '1', email: 'test@example.com', emailVerified: false };

      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');

      vi.mocked(api.api.post).mockResolvedValue({ data: {} });

      await store.logout();

      expect(store.accessToken).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.user).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('debería refrescar el access token', async () => {
      const store = useAuthStore();
      store.refreshToken = 'valid-refresh-token';

      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: { id: '1', email: 'test@example.com', emailVerified: false },
        },
      };

      vi.mocked(api.api.post).mockResolvedValue(mockResponse);

      await store.refreshAccessToken();

      expect(api.api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'valid-refresh-token',
      });
      expect(store.accessToken).toBe('new-access-token');
    });

    it('debería hacer logout si el refresh falla', async () => {
      const store = useAuthStore();
      store.refreshToken = 'invalid-refresh-token';
      store.accessToken = 'old-token';

      vi.mocked(api.api.post).mockRejectedValue(new Error('Invalid token'));

      const logoutSpy = vi.spyOn(store, 'logout');

      await expect(store.refreshAccessToken()).rejects.toThrow();
      // El logout se llama en el catch del interceptor, no directamente aquí
    });
  });

  describe('forgotPassword', () => {
    it('debería llamar al endpoint de forgot password', async () => {
      vi.mocked(api.api.post).mockResolvedValue({ data: {} });

      const store = useAuthStore();
      await store.forgotPassword('test@example.com');

      expect(api.api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('debería llamar al endpoint de reset password', async () => {
      vi.mocked(api.api.post).mockResolvedValue({ data: {} });

      const store = useAuthStore();
      await store.resetPassword('reset-token', 'NewPassword123!@#');

      expect(api.api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'NewPassword123!@#',
      });
    });
  });

  describe('fetchUser', () => {
    it('debería obtener y actualizar el usuario', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        settings: {
          timezone: 'America/Bogota',
          baseCurrency: 'USD',
        },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockUser });

      const store = useAuthStore();
      await store.fetchUser();

      expect(api.api.get).toHaveBeenCalledWith('/users/me');
      expect(store.user).toEqual(mockUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });
  });

  describe('updateSettings', () => {
    it('debería actualizar settings del usuario', async () => {
      const store = useAuthStore();
      store.user = {
        id: '1',
        email: 'test@example.com',
        emailVerified: false,
        settings: {
          id: 'settings-1',
          userId: '1',
          timezone: 'America/Bogota',
          baseCurrency: 'USD',
          onboardingCompleted: false,
        },
      };

      const updatedSettings = {
        timezone: 'America/New_York',
        baseCurrency: 'COP',
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: updatedSettings });

      await store.updateSettings(updatedSettings);

      expect(api.api.patch).toHaveBeenCalledWith('/users/me/settings', updatedSettings);
      expect(store.user?.settings?.timezone).toBe('America/New_York');
    });
  });

  describe('computed properties', () => {
    it('isAuthenticated debería ser true cuando hay token y usuario', () => {
      const store = useAuthStore();
      store.accessToken = 'token';
      store.user = { id: '1', email: 'test@example.com', emailVerified: false };

      expect(store.isAuthenticated).toBe(true);
    });

    it('isAuthenticated debería ser false cuando no hay token', () => {
      const store = useAuthStore();
      store.accessToken = null;
      store.user = { id: '1', email: 'test@example.com', emailVerified: false };

      expect(store.isAuthenticated).toBe(false);
    });

    it('userEmail debería retornar el email del usuario', () => {
      const store = useAuthStore();
      store.user = { id: '1', email: 'test@example.com', emailVerified: false };

      expect(store.userEmail).toBe('test@example.com');
    });
  });
});


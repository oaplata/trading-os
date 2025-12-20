import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import LoginView from '../LoginView.vue';
import { useAuthStore } from '@/stores/auth';
import * as api from '@/services/api';

// Mock del store
vi.mock('@/stores/auth');
vi.mock('@/services/api');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
});

describe('LoginView', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar el formulario de login', () => {
    const { getByLabelText, getByRole } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByLabelText(/email/i)).toBeInTheDocument();
    expect(getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('debería mostrar error si el email está vacío', async () => {
    const { getByRole, getByText } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    const submitButton = getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    // Esperar a que se muestre el error
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verificar que se muestra error de validación
    expect(getByText(/email es requerido/i)).toBeInTheDocument();
  });

  it('debería mostrar error si la contraseña está vacía', async () => {
    const { getByLabelText, getByRole, getByText } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    const emailInput = getByLabelText(/email/i);
    await emailInput.setValue('test@example.com');

    const submitButton = getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));
    
    expect(getByText(/contraseña es requerida/i)).toBeInTheDocument();
  });

  it('debería llamar a login cuando el formulario es válido', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    authStore.login = mockLogin;

    const { getByLabelText, getByRole } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('Test123!@#');

    const submitButton = getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Test123!@#');
  });

  it('debería mostrar error si el login falla', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: { data: { message: 'Credenciales inválidas' } },
    });
    authStore.login = mockLogin;

    const { getByLabelText, getByRole, findByText } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('WrongPassword123!@#');

    const submitButton = getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    const errorMessage = await findByText(/credenciales inválidas/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('debería mostrar estado de carga durante el login', async () => {
    const mockLogin = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        })
    );
    authStore.login = mockLogin;

    const { getByLabelText, getByRole } = mount(LoginView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('Test123!@#');

    const submitButton = getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    // El botón debería estar deshabilitado durante la carga
    expect(submitButton).toBeDisabled();
  });
});


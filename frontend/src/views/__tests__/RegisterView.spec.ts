import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import RegisterView from '../RegisterView.vue';
import { useAuthStore } from '@/stores/auth';

vi.mock('@/stores/auth');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/register', component: RegisterView },
    { path: '/onboarding', component: { template: '<div>Onboarding</div>' } },
  ],
});

describe('RegisterView', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar el formulario de registro', () => {
    const { getByLabelText, getByRole } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByLabelText(/email/i)).toBeInTheDocument();
    expect(getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /registrarse/i })).toBeInTheDocument();
  });

  it('debería validar que las contraseñas coincidan', async () => {
    const { getByLabelText, getByRole, findByText } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('Test123!@#');
    await getByLabelText(/confirmar contraseña/i).setValue('Different123!@#');

    const submitButton = getByRole('button', { name: /registrarse/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const errorMessage = await findByText(/contraseñas no coinciden/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('debería validar fortaleza de contraseña', async () => {
    const { getByLabelText, getByRole, findByText } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('weak');
    await getByLabelText(/confirmar contraseña/i).setValue('weak');

    const submitButton = getByRole('button', { name: /registrarse/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const errorMessage = await findByText(/al menos 8 caracteres/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('debería validar que la contraseña tenga mayúscula, número y símbolo', async () => {
    const { getByLabelText, getByRole, findByText } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('password123');
    await getByLabelText(/confirmar contraseña/i).setValue('password123');

    const submitButton = getByRole('button', { name: /registrarse/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const errorMessage = await findByText(/mayúscula.*número.*símbolo/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('debería llamar a register cuando el formulario es válido', async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    authStore.register = mockRegister;

    const { getByLabelText, getByRole } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('test@example.com');
    await getByLabelText(/contraseña/i).setValue('Test123!@#');
    await getByLabelText(/confirmar contraseña/i).setValue('Test123!@#');

    const submitButton = getByRole('button', { name: /registrarse/i });
    await submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'Test123!@#');
  });

  it('debería mostrar error si el email ya está registrado', async () => {
    const mockRegister = vi.fn().mockRejectedValue({
      response: { status: 409, data: { message: 'Email already registered' } },
    });
    authStore.register = mockRegister;

    const { getByLabelText, getByRole, findByText } = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });

    await getByLabelText(/email/i).setValue('existing@example.com');
    await getByLabelText(/contraseña/i).setValue('Test123!@#');
    await getByLabelText(/confirmar contraseña/i).setValue('Test123!@#');

    const submitButton = getByRole('button', { name: /registrarse/i });
    await submitButton.click();

    const errorMessage = await findByText(/ya está registrado/i);
    expect(errorMessage).toBeInTheDocument();
  });
});


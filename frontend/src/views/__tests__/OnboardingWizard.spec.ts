import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import OnboardingWizard from '../OnboardingWizard.vue';
import { useAuthStore } from '@/stores/auth';
import * as api from '@/services/api';

vi.mock('@/stores/auth');
vi.mock('@/services/api');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/onboarding', component: OnboardingWizard },
    { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
});

describe('OnboardingWizard', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar el wizard con el primer paso', () => {
    const { getByText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/configuración inicial/i)).toBeInTheDocument();
    expect(getByText(/zona horaria/i)).toBeInTheDocument();
  });

  it('debería mostrar el stepper con 4 pasos', () => {
    const { getAllByText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Debería haber 4 números en el stepper (1, 2, 3, 4)
    const stepNumbers = getAllByText(/^[1-4]$/);
    expect(stepNumbers.length).toBeGreaterThanOrEqual(4);
  });

  it('debería navegar al siguiente paso', async () => {
    const { getByRole, getByText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Verificar que estamos en el paso 1
    expect(getByText(/zona horaria/i)).toBeInTheDocument();

    // Hacer clic en "Siguiente"
    const nextButton = getByRole('button', { name: /siguiente/i });
    await nextButton.click();

    // Verificar que estamos en el paso 2
    expect(getByText(/moneda base/i)).toBeInTheDocument();
  });

  it('debería navegar al paso anterior', async () => {
    const { getByRole, getByText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Ir al paso 2
    const nextButton = getByRole('button', { name: /siguiente/i });
    await nextButton.click();

    // Volver al paso 1
    const prevButton = getByRole('button', { name: /anterior/i });
    await prevButton.click();

    // Verificar que estamos de vuelta en el paso 1
    expect(getByText(/zona horaria/i)).toBeInTheDocument();
  });

  it('debería mostrar todos los pasos del wizard', async () => {
    const { getByRole, getByText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Paso 1: Zona Horaria
    expect(getByText(/zona horaria/i)).toBeInTheDocument();

    // Ir al paso 2
    await getByRole('button', { name: /siguiente/i }).click();
    expect(getByText(/moneda base/i)).toBeInTheDocument();

    // Ir al paso 3
    await getByRole('button', { name: /siguiente/i }).click();
    expect(getByText(/crear primera cuenta/i)).toBeInTheDocument();

    // Ir al paso 4
    await getByRole('button', { name: /siguiente/i }).click();
    expect(getByText(/riesgo por defecto/i)).toBeInTheDocument();
  });

  it('debería completar el onboarding y llamar a las APIs', async () => {
    const mockUpdateSettings = vi.fn().mockResolvedValue({});
    const mockFetchUser = vi.fn().mockResolvedValue({});
    authStore.updateSettings = mockUpdateSettings;
    authStore.fetchUser = mockFetchUser;

    vi.spyOn(api, 'api').mockResolvedValue({ data: {} } as any);

    const { getByRole, getByLabelText } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Navegar hasta el último paso
    for (let i = 0; i < 3; i++) {
      await getByRole('button', { name: /siguiente/i }).click();
    }

    // Completar el onboarding
    const completeButton = getByRole('button', {
      name: /completar configuración/i,
    });
    await completeButton.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockUpdateSettings).toHaveBeenCalled();
  });

  it('debería tener valores por defecto correctos', () => {
    const { getByDisplayValue } = mount(OnboardingWizard, {
      global: {
        plugins: [router],
      },
    });

    // Verificar timezone por defecto
    expect(getByDisplayValue('America/Bogota')).toBeInTheDocument();
  });
});


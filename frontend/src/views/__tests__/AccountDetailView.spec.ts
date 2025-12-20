import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AccountDetailView from '../AccountDetailView.vue';
import { useAccountsStore } from '@/stores/accounts';

// Mock del store
vi.mock('@/stores/accounts');
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: () => ({
      params: { id: '1' },
    }),
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/accounts/:id', component: AccountDetailView },
  ],
});

describe('AccountDetailView', () => {
  let accountsStore: ReturnType<typeof useAccountsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    accountsStore = useAccountsStore() as any;
    vi.clearAllMocks();
  });

  it('debería mostrar métricas correctamente', () => {
    accountsStore.selectedAccount = {
      id: '1',
      userId: 'user-1',
      name: 'Test Account',
      broker: 'Test Broker',
      type: 'SPOT',
      currency: 'USD',
      status: 'ACTIVE',
      initialBalance: 1000,
      currentBalance: 1500,
      equity: 1500,
      drawdown: 5.5,
      monthlyReturn: 10.2,
      totalCashflows: 500,
      totalRealizedPnL: 0,
      notes: null,
      closedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    accountsStore.loading = false;

    const { getByText } = mount(AccountDetailView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText('Test Account')).toBeInTheDocument();
    expect(getByText(/equity/i)).toBeInTheDocument();
    expect(getByText(/drawdown/i)).toBeInTheDocument();
    expect(getByText(/rendimiento mensual/i)).toBeInTheDocument();
  });

  it('debería llamar a fetchAccountDetails al montar', () => {
    accountsStore.fetchAccountDetails = vi.fn();
    accountsStore.loading = false;
    accountsStore.selectedAccount = null;

    mount(AccountDetailView, {
      global: {
        plugins: [router],
      },
    });

    expect(accountsStore.fetchAccountDetails).toHaveBeenCalledWith('1');
  });

  it('debería mostrar loading state', () => {
    accountsStore.loading = true;
    accountsStore.selectedAccount = null;

    const { container } = mount(AccountDetailView, {
      global: {
        plugins: [router],
      },
    });

    expect(container.querySelector('.flex.justify-center')).toBeInTheDocument();
  });

  it('debería mostrar error si no se encuentra la cuenta', () => {
    accountsStore.loading = false;
    accountsStore.error = 'Cuenta no encontrada';
    accountsStore.selectedAccount = null;

    const { getByText } = mount(AccountDetailView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/cuenta no encontrada/i)).toBeInTheDocument();
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AccountsListView from '../AccountsListView.vue';
import { useAccountsStore } from '@/stores/accounts';

// Mock del store
vi.mock('@/stores/accounts');
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/accounts', component: AccountsListView },
    { path: '/accounts/new', component: { template: '<div>New Account</div>' } },
  ],
});

describe('AccountsListView', () => {
  let accountsStore: ReturnType<typeof useAccountsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    accountsStore = useAccountsStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar lista de cuentas', () => {
    accountsStore.accounts = [
      {
        id: '1',
        userId: 'user-1',
        name: 'Test Account 1',
        broker: 'Test Broker',
        type: 'SPOT',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 1000,
        currentBalance: 1000,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user-1',
        name: 'Test Account 2',
        broker: 'Test Broker 2',
        type: 'FUTURES',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 5000,
        currentBalance: 5000,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    accountsStore.loading = false;

    const { getByText } = mount(AccountsListView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText('Test Account 1')).toBeInTheDocument();
    expect(getByText('Test Account 2')).toBeInTheDocument();
  });

  it('debería aplicar filtros', async () => {
    accountsStore.accounts = [
      {
        id: '1',
        userId: 'user-1',
        name: 'Spot Account',
        broker: 'Broker',
        type: 'SPOT',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 1000,
        currentBalance: 1000,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user-1',
        name: 'Futures Account',
        broker: 'Broker',
        type: 'FUTURES',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 5000,
        currentBalance: 5000,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    accountsStore.loading = false;

    const { getByLabelText, getByText, queryByText } = mount(AccountsListView, {
      global: {
        plugins: [router],
      },
    });

    // Filtrar por tipo SPOT
    const typeFilter = getByLabelText(/tipo/i);
    await typeFilter.setValue('SPOT');

    // Verificar que solo se muestra la cuenta SPOT
    expect(getByText('Spot Account')).toBeInTheDocument();
    expect(queryByText('Futures Account')).not.toBeInTheDocument();
  });

  it('debería mostrar loading state', () => {
    accountsStore.loading = true;
    accountsStore.accounts = [];

    const { container } = mount(AccountsListView, {
      global: {
        plugins: [router],
      },
    });

    // Verificar que se muestra el spinner de carga
    expect(container.querySelector('.flex.justify-center')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay cuentas', () => {
    accountsStore.loading = false;
    accountsStore.accounts = [];

    const { getByText } = mount(AccountsListView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/no hay cuentas registradas/i)).toBeInTheDocument();
  });

  it('debería llamar a fetchAccounts al montar', () => {
    accountsStore.fetchAccounts = vi.fn();
    accountsStore.loading = false;
    accountsStore.accounts = [];

    mount(AccountsListView, {
      global: {
        plugins: [router],
      },
    });

    expect(accountsStore.fetchAccounts).toHaveBeenCalled();
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import CashflowsView from '../CashflowsView.vue';
import { useCashflowsStore } from '@/stores/cashflows';
import { useAccountsStore } from '@/stores/accounts';

// Mock de los stores
vi.mock('@/stores/cashflows');
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
    { path: '/cashflows', component: CashflowsView },
    { path: '/cashflows/new', component: { template: '<div>New Cashflow</div>' } },
  ],
});

describe('CashflowsView', () => {
  let cashflowsStore: ReturnType<typeof useCashflowsStore>;
  let accountsStore: ReturnType<typeof useAccountsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    cashflowsStore = useCashflowsStore() as any;
    accountsStore = useAccountsStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar timeline', () => {
    cashflowsStore.cashflows = [
      {
        id: '1',
        accountId: 'account-1',
        userId: 'user-1',
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'USD',
        description: 'Test deposit',
        date: new Date().toISOString(),
        category: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: {
          id: 'account-1',
          name: 'Test Account',
        },
      },
      {
        id: '2',
        accountId: 'account-1',
        userId: 'user-1',
        type: 'WITHDRAWAL',
        amount: 200,
        currency: 'USD',
        description: 'Test withdrawal',
        date: new Date().toISOString(),
        category: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: {
          id: 'account-1',
          name: 'Test Account',
        },
      },
    ];
    cashflowsStore.loading = false;
    cashflowsStore.totals = {
      deposits: 1000,
      withdrawals: 200,
      adjustments: 0,
      fees: 0,
      net: 800,
    };
    accountsStore.accounts = [];

    const { getByText } = mount(CashflowsView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/cashflows/i)).toBeInTheDocument();
    expect(getByText(/total depósitos/i)).toBeInTheDocument();
  });

  it('debería aplicar filtros', async () => {
    cashflowsStore.cashflows = [];
    cashflowsStore.loading = false;
    cashflowsStore.totals = {
      deposits: 0,
      withdrawals: 0,
      adjustments: 0,
      fees: 0,
      net: 0,
    };
    accountsStore.accounts = [
      {
        id: 'account-1',
        userId: 'user-1',
        name: 'Test Account',
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
    ];

    const { getByLabelText } = mount(CashflowsView, {
      global: {
        plugins: [router],
      },
    });

    // Aplicar filtro por cuenta
    const accountFilter = getByLabelText(/cuenta/i);
    await accountFilter.setValue('account-1');

    // Verificar que el filtro se aplicó
    expect(cashflowsStore.filters.accountId).toBe('account-1');
  });

  it('debería mostrar loading state', () => {
    cashflowsStore.loading = true;
    cashflowsStore.cashflows = [];
    cashflowsStore.totals = {
      deposits: 0,
      withdrawals: 0,
      adjustments: 0,
      fees: 0,
      net: 0,
    };
    accountsStore.accounts = [];

    const { container } = mount(CashflowsView, {
      global: {
        plugins: [router],
      },
    });

    expect(container.querySelector('.flex.justify-center')).toBeInTheDocument();
  });

  it('debería llamar a fetchCashflows al montar', () => {
    cashflowsStore.fetchCashflows = vi.fn();
    cashflowsStore.loading = false;
    cashflowsStore.cashflows = [];
    cashflowsStore.totals = {
      deposits: 0,
      withdrawals: 0,
      adjustments: 0,
      fees: 0,
      net: 0,
    };
    accountsStore.fetchAccounts = vi.fn();
    accountsStore.accounts = [];

    mount(CashflowsView, {
      global: {
        plugins: [router],
      },
    });

    expect(cashflowsStore.fetchCashflows).toHaveBeenCalled();
    expect(accountsStore.fetchAccounts).toHaveBeenCalled();
  });
});


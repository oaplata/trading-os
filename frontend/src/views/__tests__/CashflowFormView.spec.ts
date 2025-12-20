import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import CashflowFormView from '../CashflowFormView.vue';
import { useCashflowsStore } from '@/stores/cashflows';
import { useAccountsStore } from '@/stores/accounts';

// Mock de los stores
vi.mock('@/stores/cashflows');
vi.mock('@/stores/accounts');
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: () => ({
      params: { id: undefined },
      query: {},
    }),
    useRouter: () => ({
      push: vi.fn(),
      back: vi.fn(),
    }),
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/cashflows/new', component: CashflowFormView },
    { path: '/cashflows/:id/edit', component: CashflowFormView },
  ],
});

describe('CashflowFormView', () => {
  let cashflowsStore: ReturnType<typeof useCashflowsStore>;
  let accountsStore: ReturnType<typeof useAccountsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    cashflowsStore = useCashflowsStore() as any;
    accountsStore = useAccountsStore() as any;
    vi.clearAllMocks();
  });

  it('debería validar formulario', async () => {
    accountsStore.activeAccounts = [
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
    cashflowsStore.createCashflow = vi.fn().mockResolvedValue({});

    const { getByLabelText, getByRole, getByText } = mount(CashflowFormView, {
      global: {
        plugins: [router],
      },
    });

    // Intentar enviar sin llenar campos
    const submitButton = getByRole('button', { name: /crear|guardar/i });
    await submitButton.click();

    // Esperar validación
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verificar que se muestran errores de validación
    expect(getByText(/cuenta es requerida|seleccionar cuenta/i)).toBeInTheDocument();
  });

  it('debería crear cashflow con datos válidos', async () => {
    accountsStore.activeAccounts = [
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
    cashflowsStore.createCashflow = vi.fn().mockResolvedValue({
      id: '1',
      accountId: 'account-1',
      type: 'DEPOSIT',
      amount: 1000,
      currency: 'USD',
    });

    const { getByLabelText, getByRole } = mount(CashflowFormView, {
      global: {
        plugins: [router],
      },
    });

    // Llenar formulario
    const accountSelect = getByLabelText(/cuenta/i);
    await accountSelect.setValue('account-1');

    // Seleccionar tipo DEPOSIT (radio button)
    const depositRadio = getByLabelText(/depósito/i);
    await depositRadio.click();

    const amountInput = getByLabelText(/monto/i);
    await amountInput.setValue('1000');

    // Enviar formulario
    const submitButton = getByRole('button', { name: /crear|guardar/i });
    await submitButton.click();

    // Verificar que se llamó createCashflow
    expect(cashflowsStore.createCashflow).toHaveBeenCalled();
  });

  it('debería validar que el monto sea positivo', async () => {
    accountsStore.activeAccounts = [
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

    const { getByLabelText, getByRole } = mount(CashflowFormView, {
      global: {
        plugins: [router],
      },
    });

    const accountSelect = getByLabelText(/cuenta/i);
    await accountSelect.setValue('account-1');

    const depositRadio = getByLabelText(/depósito/i);
    await depositRadio.click();

    // Intentar con monto negativo o cero
    const amountInput = getByLabelText(/monto/i);
    await amountInput.setValue('0');

    const submitButton = getByRole('button', { name: /crear|guardar/i });
    await submitButton.click();

    // Verificar validación HTML5 (min="0.01")
    expect(amountInput).toHaveAttribute('min', '0.01');
  });

  it('debería mostrar modo edición si hay ID en la ruta', () => {
    // Mock para modo edición
    vi.mock('vue-router', async () => {
      const actual = await vi.importActual('vue-router');
      return {
        ...actual,
        useRoute: () => ({
          params: { id: '1' },
          query: {},
        }),
        useRouter: () => ({
          push: vi.fn(),
          back: vi.fn(),
        }),
      };
    });

    accountsStore.activeAccounts = [];
    cashflowsStore.cashflows = [
      {
        id: '1',
        accountId: 'account-1',
        userId: 'user-1',
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'USD',
        description: 'Test',
        date: new Date().toISOString(),
        category: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: { id: 'account-1', name: 'Test Account' },
      },
    ];

    const { getByText } = mount(CashflowFormView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/editar cashflow/i)).toBeInTheDocument();
  });
});


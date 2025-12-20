import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAccountsStore } from '../accounts';
import * as api from '@/services/api';

// Mock del módulo de API
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AccountsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchAccounts', () => {
    it('debería obtener lista de cuentas', async () => {
      const mockAccounts = [
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

      vi.mocked(api.api.get).mockResolvedValue({ data: mockAccounts });

      const store = useAccountsStore();
      const result = await store.fetchAccounts();

      expect(api.api.get).toHaveBeenCalledWith('/accounts');
      expect(store.accounts).toEqual(mockAccounts);
      expect(result).toEqual(mockAccounts);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('debería manejar errores correctamente', async () => {
      const error = new Error('Network error');
      vi.mocked(api.api.get).mockRejectedValue(error);

      const store = useAccountsStore();
      
      await expect(store.fetchAccounts()).rejects.toThrow();
      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchAccountDetails', () => {
    it('debería obtener detalles de cuenta con métricas', async () => {
      const mockAccountDetail = {
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
        drawdown: 0,
        monthlyReturn: 5.5,
        totalCashflows: 500,
        totalRealizedPnL: 0,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockAccountDetail });

      const store = useAccountsStore();
      const result = await store.fetchAccountDetails('1');

      expect(api.api.get).toHaveBeenCalledWith('/accounts/1');
      expect(store.selectedAccount).toEqual(mockAccountDetail);
      expect(result).toEqual(mockAccountDetail);
    });

    it('debería actualizar la cuenta en la lista si existe', async () => {
      const store = useAccountsStore();
      store.accounts = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Old Name',
          broker: 'Old Broker',
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

      const mockAccountDetail = {
        id: '1',
        userId: 'user-1',
        name: 'Updated Name',
        broker: 'Updated Broker',
        type: 'SPOT',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 1000,
        currentBalance: 1500,
        equity: 1500,
        drawdown: 0,
        monthlyReturn: 5.5,
        totalCashflows: 500,
        totalRealizedPnL: 0,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockAccountDetail });

      await store.fetchAccountDetails('1');

      expect(store.accounts[0].name).toBe('Updated Name');
      expect(store.accounts[0].broker).toBe('Updated Broker');
    });
  });

  describe('createAccount', () => {
    it('debería crear una nueva cuenta', async () => {
      const newAccount = {
        name: 'New Account',
        broker: 'New Broker',
        type: 'SPOT' as const,
        currency: 'USD',
        initialBalance: 2000,
      };

      const mockCreatedAccount = {
        id: '3',
        userId: 'user-1',
        ...newAccount,
        status: 'ACTIVE',
        currentBalance: 2000,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: mockCreatedAccount });

      const store = useAccountsStore();
      const result = await store.createAccount(newAccount);

      expect(api.api.post).toHaveBeenCalledWith('/accounts', newAccount);
      expect(store.accounts).toContainEqual(mockCreatedAccount);
      expect(result).toEqual(mockCreatedAccount);
    });
  });

  describe('updateAccount', () => {
    it('debería actualizar una cuenta existente', async () => {
      const store = useAccountsStore();
      store.accounts = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Old Name',
          broker: 'Old Broker',
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

      const updateData = {
        name: 'Updated Name',
        broker: 'Updated Broker',
      };

      const mockUpdatedAccount = {
        ...store.accounts[0],
        ...updateData,
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: mockUpdatedAccount });

      const result = await store.updateAccount('1', updateData);

      expect(api.api.patch).toHaveBeenCalledWith('/accounts/1', updateData);
      expect(store.accounts[0].name).toBe('Updated Name');
      expect(store.accounts[0].broker).toBe('Updated Broker');
      expect(result).toEqual(mockUpdatedAccount);
    });

    it('debería actualizar selectedAccount si es la cuenta seleccionada', async () => {
      const store = useAccountsStore();
      store.selectedAccount = {
        id: '1',
        userId: 'user-1',
        name: 'Old Name',
        broker: 'Old Broker',
        type: 'SPOT',
        currency: 'USD',
        status: 'ACTIVE',
        initialBalance: 1000,
        currentBalance: 1000,
        equity: 1000,
        drawdown: 0,
        monthlyReturn: 0,
        totalCashflows: 0,
        totalRealizedPnL: 0,
        notes: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updateData = { name: 'Updated Name' };
      const mockUpdatedAccount = {
        ...store.selectedAccount,
        ...updateData,
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: mockUpdatedAccount });

      await store.updateAccount('1', updateData);

      expect(store.selectedAccount?.name).toBe('Updated Name');
    });
  });

  describe('closeAccount', () => {
    it('debería cerrar una cuenta', async () => {
      const store = useAccountsStore();
      store.accounts = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Test Account',
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
      ];

      const mockClosedAccount = {
        ...store.accounts[0],
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.delete).mockResolvedValue({ data: mockClosedAccount });

      const result = await store.closeAccount('1');

      expect(api.api.delete).toHaveBeenCalledWith('/accounts/1');
      expect(store.accounts[0].status).toBe('CLOSED');
      expect(result).toEqual(mockClosedAccount);
    });
  });

  describe('getters', () => {
    it('activeAccounts debería filtrar solo cuentas activas', () => {
      const store = useAccountsStore();
      store.accounts = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Active Account',
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
          name: 'Closed Account',
          broker: 'Broker',
          type: 'SPOT',
          currency: 'USD',
          status: 'CLOSED',
          initialBalance: 1000,
          currentBalance: 1000,
          notes: null,
          closedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.activeAccounts).toHaveLength(1);
      expect(store.activeAccounts[0].status).toBe('ACTIVE');
    });

    it('accountsByCurrency debería agrupar por moneda', () => {
      const store = useAccountsStore();
      store.accounts = [
        {
          id: '1',
          userId: 'user-1',
          name: 'USD Account',
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
          name: 'COP Account',
          broker: 'Broker',
          type: 'SPOT',
          currency: 'COP',
          status: 'ACTIVE',
          initialBalance: 1000,
          currentBalance: 1000,
          notes: null,
          closedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const grouped = store.accountsByCurrency;
      expect(grouped.USD).toHaveLength(1);
      expect(grouped.COP).toHaveLength(1);
    });

    it('accountsByType debería agrupar por tipo', () => {
      const store = useAccountsStore();
      store.accounts = [
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
          initialBalance: 1000,
          currentBalance: 1000,
          notes: null,
          closedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const grouped = store.accountsByType;
      expect(grouped.SPOT).toHaveLength(1);
      expect(grouped.FUTURES).toHaveLength(1);
    });
  });
});


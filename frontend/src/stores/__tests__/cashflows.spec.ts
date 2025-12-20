import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCashflowsStore } from '../cashflows';
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

describe('CashflowsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchCashflows', () => {
    it('debería obtener lista de cashflows', async () => {
      const mockCashflows = [
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

      const mockResponse = {
        data: mockCashflows,
        meta: {
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      vi.mocked(api.api.get).mockResolvedValue(mockResponse);

      const store = useCashflowsStore();
      const result = await store.fetchCashflows();

      expect(api.api.get).toHaveBeenCalledWith('/cashflows', {
        params: expect.objectContaining({
          page: 1,
          limit: 50,
        }),
      });
      expect(store.cashflows).toEqual(mockCashflows);
      expect(store.pagination.total).toBe(2);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('debería aplicar filtros correctamente', async () => {
      const mockResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        },
      };

      vi.mocked(api.api.get).mockResolvedValue(mockResponse);

      const store = useCashflowsStore();
      await store.fetchCashflows({
        accountId: 'account-1',
        type: 'DEPOSIT',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(api.api.get).toHaveBeenCalledWith('/cashflows', {
        params: expect.objectContaining({
          accountId: 'account-1',
          type: 'DEPOSIT',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      });
      expect(store.filters.accountId).toBe('account-1');
      expect(store.filters.type).toBe('DEPOSIT');
    });

    it('debería manejar errores correctamente', async () => {
      const error = new Error('Network error');
      vi.mocked(api.api.get).mockRejectedValue(error);

      const store = useCashflowsStore();
      
      await expect(store.fetchCashflows()).rejects.toThrow();
      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('createCashflow', () => {
    it('debería crear un nuevo cashflow', async () => {
      const newCashflow = {
        accountId: 'account-1',
        type: 'DEPOSIT' as const,
        amount: 1000,
        currency: 'USD',
        description: 'Test deposit',
        date: new Date().toISOString(),
      };

      const mockCreatedCashflow = {
        id: '1',
        userId: 'user-1',
        ...newCashflow,
        category: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: {
          id: 'account-1',
          name: 'Test Account',
        },
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: mockCreatedCashflow });

      const store = useCashflowsStore();
      const result = await store.createCashflow(newCashflow);

      expect(api.api.post).toHaveBeenCalledWith('/cashflows', newCashflow);
      expect(store.cashflows).toContainEqual(mockCreatedCashflow);
      expect(result).toEqual(mockCreatedCashflow);
    });
  });

  describe('updateCashflow', () => {
    it('debería actualizar un cashflow existente', async () => {
      const store = useCashflowsStore();
      store.cashflows = [
        {
          id: '1',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'DEPOSIT',
          amount: 1000,
          currency: 'USD',
          description: 'Old description',
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

      const updateData = {
        amount: 1500,
        description: 'Updated description',
      };

      const mockUpdatedCashflow = {
        ...store.cashflows[0],
        ...updateData,
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: mockUpdatedCashflow });

      const result = await store.updateCashflow('1', updateData);

      expect(api.api.patch).toHaveBeenCalledWith('/cashflows/1', updateData);
      expect(store.cashflows[0].amount).toBe(1500);
      expect(store.cashflows[0].description).toBe('Updated description');
      expect(result).toEqual(mockUpdatedCashflow);
    });
  });

  describe('deleteCashflow', () => {
    it('debería eliminar un cashflow', async () => {
      const store = useCashflowsStore();
      store.cashflows = [
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
      ];

      vi.mocked(api.api.delete).mockResolvedValue({ data: { message: 'Deleted' } });

      await store.deleteCashflow('1');

      expect(api.api.delete).toHaveBeenCalledWith('/cashflows/1');
      expect(store.cashflows).toHaveLength(0);
    });
  });

  describe('getTotals', () => {
    it('debería obtener totales por cuenta', async () => {
      const mockTotal = 5000;
      vi.mocked(api.api.get).mockResolvedValue({ data: mockTotal });

      const store = useCashflowsStore();
      const result = await store.getTotals('account-1');

      expect(api.api.get).toHaveBeenCalledWith('/cashflows/account/account-1/total');
      expect(result).toBe(mockTotal);
    });
  });

  describe('getters', () => {
    it('depositsTotal debería sumar depósitos y ajustes', () => {
      const store = useCashflowsStore();
      store.cashflows = [
        {
          id: '1',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'DEPOSIT',
          amount: 1000,
          currency: 'USD',
          description: 'Deposit',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '2',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'ADJUSTMENT',
          amount: 500,
          currency: 'USD',
          description: 'Adjustment',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
      ];

      expect(store.depositsTotal).toBe(1500);
    });

    it('withdrawalsTotal debería sumar retiros y fees', () => {
      const store = useCashflowsStore();
      store.cashflows = [
        {
          id: '1',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: 200,
          currency: 'USD',
          description: 'Withdrawal',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '2',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'FEE',
          amount: 50,
          currency: 'USD',
          description: 'Fee',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
      ];

      expect(store.withdrawalsTotal).toBe(250);
    });

    it('netTotal debería calcular el neto correctamente', () => {
      const store = useCashflowsStore();
      store.cashflows = [
        {
          id: '1',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'DEPOSIT',
          amount: 1000,
          currency: 'USD',
          description: 'Deposit',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '2',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: 300,
          currency: 'USD',
          description: 'Withdrawal',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
      ];

      expect(store.netTotal).toBe(700); // 1000 - 300
    });

    it('totals debería calcular todos los totales por tipo', () => {
      const store = useCashflowsStore();
      store.cashflows = [
        {
          id: '1',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'DEPOSIT',
          amount: 1000,
          currency: 'USD',
          description: 'Deposit',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '2',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: 200,
          currency: 'USD',
          description: 'Withdrawal',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '3',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'ADJUSTMENT',
          amount: 500,
          currency: 'USD',
          description: 'Adjustment',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
        {
          id: '4',
          accountId: 'account-1',
          userId: 'user-1',
          type: 'FEE',
          amount: 50,
          currency: 'USD',
          description: 'Fee',
          date: new Date().toISOString(),
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          account: { id: 'account-1', name: 'Test' },
        },
      ];

      const totals = store.totals;
      expect(totals.deposits).toBe(1000);
      expect(totals.withdrawals).toBe(200);
      expect(totals.adjustments).toBe(500);
      expect(totals.fees).toBe(50);
      expect(totals.net).toBe(1250); // 1000 + 500 - 200 - 50
    });
  });
});


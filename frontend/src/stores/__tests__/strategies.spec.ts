import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStrategiesStore } from '../strategies';
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

describe('StrategiesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchStrategies', () => {
    it('debería obtener lista de estrategias', async () => {
      const mockStrategies = {
        data: [
          {
            id: '1',
            userId: 'user-1',
            name: 'Swing Trading Crypto',
            description: 'Estrategia de swing trading',
            targetMarket: 'CRYPTO',
            typicalTimeframe: '4H',
            isActive: true,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            setupCount: 3,
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockStrategies });

      const store = useStrategiesStore();
      const result = await store.fetchStrategies();

      expect(api.api.get).toHaveBeenCalledWith('/strategies', {
        params: expect.objectContaining({
          page: 1,
          limit: 50,
        }),
      });
      expect(store.strategies).toEqual(mockStrategies.data);
      expect(store.pagination.total).toBe(1);
      expect(result).toEqual(mockStrategies);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('debería aplicar filtros correctamente', async () => {
      const mockStrategies = {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockStrategies });

      const store = useStrategiesStore();
      await store.fetchStrategies({
        targetMarket: 'CRYPTO',
        isActive: true,
      });

      expect(api.api.get).toHaveBeenCalledWith('/strategies', {
        params: expect.objectContaining({
          targetMarket: 'CRYPTO',
          isActive: true,
        }),
      });
    });
  });

  describe('fetchStrategy', () => {
    it('debería obtener estrategia por ID', async () => {
      const mockStrategy = {
        id: '1',
        userId: 'user-1',
        name: 'Swing Trading Crypto',
        description: 'Estrategia de swing trading',
        targetMarket: 'CRYPTO',
        typicalTimeframe: '4H',
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockStrategy });

      const store = useStrategiesStore();
      const result = await store.fetchStrategy('1');

      expect(api.api.get).toHaveBeenCalledWith('/strategies/1');
      expect(store.selectedStrategy).toEqual(mockStrategy);
      expect(result).toEqual(mockStrategy);
    });
  });

  describe('createStrategy', () => {
    it('debería crear estrategia exitosamente', async () => {
      const createDto = {
        name: 'New Strategy',
        description: 'Nueva estrategia',
        targetMarket: 'STOCKS',
      };

      const mockStrategy = {
        id: '2',
        userId: 'user-1',
        ...createDto,
        typicalTimeframe: null,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: mockStrategy });

      const store = useStrategiesStore();
      const result = await store.createStrategy(createDto);

      expect(api.api.post).toHaveBeenCalledWith('/strategies', createDto);
      expect(store.strategies).toContainEqual(mockStrategy);
      expect(result).toEqual(mockStrategy);
    });
  });

  describe('updateStrategy', () => {
    it('debería actualizar estrategia', async () => {
      const store = useStrategiesStore();
      store.strategies = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Old Name',
          description: null,
          targetMarket: null,
          typicalTimeframe: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const updateDto = { name: 'Updated Name' };
      const updatedStrategy = {
        ...store.strategies[0],
        ...updateDto,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: updatedStrategy });

      const result = await store.updateStrategy('1', updateDto);

      expect(api.api.patch).toHaveBeenCalledWith('/strategies/1', updateDto);
      expect(store.strategies[0].name).toBe('Updated Name');
      expect(result).toEqual(updatedStrategy);
    });
  });

  describe('deleteStrategy', () => {
    it('debería eliminar estrategia', async () => {
      const store = useStrategiesStore();
      store.strategies = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Strategy to Delete',
          description: null,
          targetMarket: null,
          typicalTimeframe: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      store.selectedStrategy = store.strategies[0];

      vi.mocked(api.api.delete).mockResolvedValue({ data: {} });

      await store.deleteStrategy('1');

      expect(api.api.delete).toHaveBeenCalledWith('/strategies/1');
      expect(store.strategies).toHaveLength(0);
      expect(store.selectedStrategy).toBeNull();
    });
  });

  describe('getters', () => {
    it('activeStrategies debería filtrar estrategias activas', () => {
      const store = useStrategiesStore();
      store.strategies = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Active Strategy',
          description: null,
          targetMarket: null,
          typicalTimeframe: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          name: 'Inactive Strategy',
          description: null,
          targetMarket: null,
          typicalTimeframe: null,
          isActive: false,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.activeStrategies).toHaveLength(1);
      expect(store.activeStrategies[0].id).toBe('1');
    });

    it('strategiesByMarket debería agrupar por mercado', () => {
      const store = useStrategiesStore();
      store.strategies = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Crypto Strategy',
          description: null,
          targetMarket: 'CRYPTO',
          typicalTimeframe: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          name: 'Stocks Strategy',
          description: null,
          targetMarket: 'STOCKS',
          typicalTimeframe: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const grouped = store.strategiesByMarket;
      expect(grouped['CRYPTO']).toHaveLength(1);
      expect(grouped['STOCKS']).toHaveLength(1);
    });
  });
});


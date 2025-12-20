import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSetupsStore } from '../setups';
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

describe('SetupsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchSetups', () => {
    it('debería obtener lista de setups', async () => {
      const mockSetups = {
        data: [
          {
            id: '1',
            userId: 'user-1',
            strategyId: 'strategy-1',
            name: 'Breakout',
            description: 'Setup de breakout',
            suggestedTags: ['breakout', 'momentum'],
            isActive: true,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ruleCount: 5,
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockSetups });

      const store = useSetupsStore();
      const result = await store.fetchSetups();

      expect(api.api.get).toHaveBeenCalledWith('/setups', {
        params: expect.objectContaining({
          page: 1,
          limit: 50,
        }),
      });
      expect(store.setups).toEqual(mockSetups.data);
      expect(result).toEqual(mockSetups);
    });

    it('debería filtrar por strategyId', async () => {
      const mockSetups = {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockSetups });

      const store = useSetupsStore();
      await store.fetchSetups({ strategyId: 'strategy-1' });

      expect(api.api.get).toHaveBeenCalledWith('/setups', {
        params: expect.objectContaining({
          strategyId: 'strategy-1',
        }),
      });
    });
  });

  describe('fetchSetup', () => {
    it('debería obtener setup por ID', async () => {
      const mockSetup = {
        id: '1',
        userId: 'user-1',
        strategyId: 'strategy-1',
        name: 'Breakout',
        description: 'Setup de breakout',
        suggestedTags: ['breakout'],
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rules: [],
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockSetup });

      const store = useSetupsStore();
      const result = await store.fetchSetup('1');

      expect(api.api.get).toHaveBeenCalledWith('/setups/1');
      expect(store.selectedSetup).toEqual(mockSetup);
      expect(result).toEqual(mockSetup);
    });
  });

  describe('createSetup', () => {
    it('debería crear setup exitosamente', async () => {
      const createDto = {
        name: 'New Setup',
        description: 'Nuevo setup',
        suggestedTags: ['tag1'],
      };

      const mockSetup = {
        id: '2',
        userId: 'user-1',
        strategyId: null,
        ...createDto,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: mockSetup });

      const store = useSetupsStore();
      const result = await store.createSetup(createDto);

      expect(api.api.post).toHaveBeenCalledWith('/setups', createDto);
      expect(store.setups).toContainEqual(mockSetup);
      expect(result).toEqual(mockSetup);
    });
  });

  describe('updateSetup', () => {
    it('debería actualizar setup', async () => {
      const store = useSetupsStore();
      store.setups = [
        {
          id: '1',
          userId: 'user-1',
          strategyId: null,
          name: 'Old Name',
          description: null,
          suggestedTags: [],
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const updateDto = { name: 'Updated Name' };
      const updatedSetup = {
        ...store.setups[0],
        ...updateDto,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: updatedSetup });

      const result = await store.updateSetup('1', updateDto);

      expect(api.api.patch).toHaveBeenCalledWith('/setups/1', updateDto);
      expect(store.setups[0].name).toBe('Updated Name');
      expect(result).toEqual(updatedSetup);
    });
  });

  describe('deleteSetup', () => {
    it('debería eliminar setup', async () => {
      const store = useSetupsStore();
      store.setups = [
        {
          id: '1',
          userId: 'user-1',
          strategyId: null,
          name: 'Setup to Delete',
          description: null,
          suggestedTags: [],
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      store.selectedSetup = store.setups[0];

      vi.mocked(api.api.delete).mockResolvedValue({ data: {} });

      await store.deleteSetup('1');

      expect(api.api.delete).toHaveBeenCalledWith('/setups/1');
      expect(store.setups).toHaveLength(0);
      expect(store.selectedSetup).toBeNull();
    });
  });

  describe('getters', () => {
    it('activeSetups debería filtrar setups activos', () => {
      const store = useSetupsStore();
      store.setups = [
        {
          id: '1',
          userId: 'user-1',
          strategyId: null,
          name: 'Active Setup',
          description: null,
          suggestedTags: [],
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          strategyId: null,
          name: 'Inactive Setup',
          description: null,
          suggestedTags: [],
          isActive: false,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.activeSetups).toHaveLength(1);
      expect(store.activeSetups[0].id).toBe('1');
    });
  });
});


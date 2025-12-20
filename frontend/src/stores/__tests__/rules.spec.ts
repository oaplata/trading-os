import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRulesStore } from '../rules';
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

describe('RulesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchRules', () => {
    it('debería obtener lista de reglas', async () => {
      const mockRules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Price above EMA 20',
          description: 'El precio debe estar por encima de la EMA 20',
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(api.api.get).mockResolvedValue({ data: mockRules });

      const store = useRulesStore();
      const result = await store.fetchRules();

      expect(api.api.get).toHaveBeenCalledWith('/rules', {
        params: {},
      });
      expect(store.rules).toEqual(mockRules);
      expect(result).toEqual(mockRules);
    });

    it('debería filtrar por setupId', async () => {
      const mockRules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Rule 1',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(api.api.get).mockResolvedValue({ data: mockRules });

      const store = useRulesStore();
      await store.fetchRules({ setupId: 'setup-1' });

      expect(api.api.get).toHaveBeenCalledWith('/rules', {
        params: { setupId: 'setup-1' },
      });
    });
  });

  describe('fetchRulesBySetup', () => {
    it('debería obtener reglas de un setup', async () => {
      const mockRules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Rule 1',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(api.api.get).mockResolvedValue({ data: mockRules });

      const store = useRulesStore();
      const result = await store.fetchRulesBySetup('setup-1');

      expect(api.api.get).toHaveBeenCalledWith('/rules/setup/setup-1');
      expect(result).toEqual(mockRules);
    });
  });

  describe('createRule', () => {
    it('debería crear regla exitosamente', async () => {
      const createDto = {
        setupId: 'setup-1',
        name: 'New Rule',
        description: 'Nueva regla',
        order: 0,
        isRequired: false,
      };

      const mockRule = {
        id: '2',
        userId: 'user-1',
        ...createDto,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: mockRule });

      const store = useRulesStore();
      const result = await store.createRule(createDto);

      expect(api.api.post).toHaveBeenCalledWith('/rules', createDto);
      expect(store.rules).toContainEqual(mockRule);
      expect(result).toEqual(mockRule);
    });
  });

  describe('updateRule', () => {
    it('debería actualizar regla', async () => {
      const store = useRulesStore();
      store.rules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Old Name',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const updateDto = { name: 'Updated Name', order: 1 };
      const updatedRule = {
        ...store.rules[0],
        ...updateDto,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: updatedRule });

      const result = await store.updateRule('1', updateDto);

      expect(api.api.patch).toHaveBeenCalledWith('/rules/1', updateDto);
      expect(store.rules[0].name).toBe('Updated Name');
      expect(store.rules[0].order).toBe(1);
      expect(result).toEqual(updatedRule);
    });
  });

  describe('deleteRule', () => {
    it('debería eliminar regla', async () => {
      const store = useRulesStore();
      store.rules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Rule to Delete',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      store.selectedRule = store.rules[0];

      vi.mocked(api.api.delete).mockResolvedValue({ data: {} });

      await store.deleteRule('1');

      expect(api.api.delete).toHaveBeenCalledWith('/rules/1');
      expect(store.rules).toHaveLength(0);
      expect(store.selectedRule).toBeNull();
    });
  });

  describe('reorderRules', () => {
    it('debería reordenar reglas', async () => {
      const store = useRulesStore();
      store.rules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Rule 1',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Rule 2',
          description: null,
          order: 1,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const reorderedRules = [
        { ...store.rules[1], order: 0 },
        { ...store.rules[0], order: 1 },
      ];

      vi.mocked(api.api.patch).mockResolvedValue({ data: reorderedRules });

      const result = await store.reorderRules({
        setupId: 'setup-1',
        ruleIds: ['2', '1'],
      });

      expect(api.api.patch).toHaveBeenCalledWith('/rules/reorder', {
        setupId: 'setup-1',
        ruleIds: ['2', '1'],
      });
      expect(result).toEqual(reorderedRules);
    });
  });

  describe('getters', () => {
    it('activeRules debería filtrar reglas activas', () => {
      const store = useRulesStore();
      store.rules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Active Rule',
          description: null,
          order: 0,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Inactive Rule',
          description: null,
          order: 1,
          isRequired: false,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.activeRules).toHaveLength(1);
      expect(store.activeRules[0].id).toBe('1');
    });

    it('requiredRules debería filtrar reglas requeridas', () => {
      const store = useRulesStore();
      store.rules = [
        {
          id: '1',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Required Rule',
          description: null,
          order: 0,
          isRequired: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          setupId: 'setup-1',
          name: 'Optional Rule',
          description: null,
          order: 1,
          isRequired: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.requiredRules).toHaveLength(1);
      expect(store.requiredRules[0].id).toBe('1');
    });
  });
});


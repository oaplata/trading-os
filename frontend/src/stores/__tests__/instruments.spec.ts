import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInstrumentsStore } from '../instruments';
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

describe('InstrumentsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchInstruments', () => {
    it('debería obtener lista de instrumentos', async () => {
      const mockInstruments = {
        data: [
          {
            id: '1',
            userId: 'user-1',
            market: 'BINANCE',
            symbol: 'BTCUSDT',
            ticker: 'BINANCE:BTCUSDT',
            name: 'Bitcoin',
            type: 'CRYPTO',
            currencyQuote: 'USDT',
            tickSize: 0.01,
            contractSize: null,
            isActive: true,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockInstruments });

      const store = useInstrumentsStore();
      const result = await store.fetchInstruments();

      expect(api.api.get).toHaveBeenCalledWith('/instruments', {
        params: expect.objectContaining({
          page: 1,
          limit: 50,
        }),
      });
      expect(store.instruments).toEqual(mockInstruments.data);
      expect(store.pagination.total).toBe(1);
      expect(result).toEqual(mockInstruments);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('debería aplicar filtros correctamente', async () => {
      const mockInstruments = {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: mockInstruments });

      const store = useInstrumentsStore();
      await store.fetchInstruments({
        market: 'BINANCE',
        type: 'CRYPTO',
        page: 1,
        limit: 50,
      });

      expect(api.api.get).toHaveBeenCalledWith('/instruments', {
        params: expect.objectContaining({
          market: 'BINANCE',
          type: 'CRYPTO',
          page: 1,
          limit: 50,
        }),
      });
    });

    it('debería manejar errores correctamente', async () => {
      const error = new Error('Network error');
      vi.mocked(api.api.get).mockRejectedValue(error);

      const store = useInstrumentsStore();

      await expect(store.fetchInstruments()).rejects.toThrow();
      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('searchInstruments', () => {
    it('debería buscar instrumentos rápidamente', async () => {
      const mockResults = [
        {
          id: '1',
          userId: 'user-1',
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          ticker: 'BINANCE:BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
          tickSize: 0.01,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(api.api.get).mockResolvedValue({ data: mockResults });

      const store = useInstrumentsStore();
      const result = await store.searchInstruments('BTC', 10);

      expect(api.api.get).toHaveBeenCalledWith('/instruments/search', {
        params: { q: 'BTC', limit: 10 },
      });
      expect(result).toEqual(mockResults);
    });

    it('debería retornar array vacío si query está vacío', async () => {
      const store = useInstrumentsStore();
      const result = await store.searchInstruments('');

      expect(result).toEqual([]);
      expect(api.api.get).not.toHaveBeenCalled();
    });
  });

  describe('createInstrument', () => {
    it('debería crear instrumento exitosamente', async () => {
      const newInstrument = {
        id: 'new-id',
        userId: 'user-1',
        market: 'BINANCE',
        symbol: 'ETHUSDT',
        ticker: 'BINANCE:ETHUSDT',
        name: 'Ethereum',
        type: 'CRYPTO' as const,
        currencyQuote: 'USDT',
        tickSize: 0.01,
        contractSize: null,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.post).mockResolvedValue({ data: newInstrument });

      const store = useInstrumentsStore();
      const result = await store.createInstrument({
        market: 'BINANCE',
        symbol: 'ETHUSDT',
        name: 'Ethereum',
        type: 'CRYPTO',
        currencyQuote: 'USDT',
        tickSize: 0.01,
      });

      expect(api.api.post).toHaveBeenCalledWith('/instruments', {
        market: 'BINANCE',
        symbol: 'ETHUSDT',
        name: 'Ethereum',
        type: 'CRYPTO',
        currencyQuote: 'USDT',
        tickSize: 0.01,
      });
      expect(store.instruments).toContainEqual(newInstrument);
      expect(result).toEqual(newInstrument);
      expect(store.loading).toBe(false);
    });

    it('debería manejar errores correctamente', async () => {
      const error = { response: { data: { message: 'Ticker duplicado' } } };
      vi.mocked(api.api.post).mockRejectedValue(error);

      const store = useInstrumentsStore();

      await expect(
        store.createInstrument({
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
        }),
      ).rejects.toThrow();
      expect(store.error).toBe('Ticker duplicado');
      expect(store.loading).toBe(false);
    });
  });

  describe('updateInstrument', () => {
    it('debería actualizar instrumento exitosamente', async () => {
      const existingInstrument = {
        id: 'instrument-id',
        userId: 'user-1',
        market: 'BINANCE',
        symbol: 'BTCUSDT',
        ticker: 'BINANCE:BTCUSDT',
        name: 'Bitcoin',
        type: 'CRYPTO' as const,
        currencyQuote: 'USDT',
        tickSize: 0.01,
        contractSize: null,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedInstrument = {
        ...existingInstrument,
        name: 'Updated Bitcoin',
        notes: 'Updated notes',
      };

      vi.mocked(api.api.patch).mockResolvedValue({ data: updatedInstrument });

      const store = useInstrumentsStore();
      store.instruments = [existingInstrument];
      const result = await store.updateInstrument('instrument-id', {
        name: 'Updated Bitcoin',
        notes: 'Updated notes',
      });

      expect(api.api.patch).toHaveBeenCalledWith('/instruments/instrument-id', {
        name: 'Updated Bitcoin',
        notes: 'Updated notes',
      });
      expect(store.instruments[0].name).toBe('Updated Bitcoin');
      expect(result).toEqual(updatedInstrument);
      expect(store.loading).toBe(false);
    });
  });

  describe('deleteInstrument', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      const instrument = {
        id: 'instrument-id',
        userId: 'user-1',
        market: 'BINANCE',
        symbol: 'BTCUSDT',
        ticker: 'BINANCE:BTCUSDT',
        name: 'Bitcoin',
        type: 'CRYPTO' as const,
        currencyQuote: 'USDT',
        tickSize: 0.01,
        contractSize: null,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const store = useInstrumentsStore();
      store.instruments = [instrument];

      vi.mocked(api.api.delete).mockResolvedValue({});

      await store.deleteInstrument('instrument-id');

      expect(api.api.delete).toHaveBeenCalledWith('/instruments/instrument-id');
      expect(store.instruments[0].isActive).toBe(false);
      expect(store.loading).toBe(false);
    });
  });

  describe('findByTicker', () => {
    it('debería buscar instrumento por ticker', async () => {
      const instrument = {
        id: 'instrument-id',
        userId: 'user-1',
        market: 'BINANCE',
        symbol: 'BTCUSDT',
        ticker: 'BINANCE:BTCUSDT',
        name: 'Bitcoin',
        type: 'CRYPTO' as const,
        currencyQuote: 'USDT',
        tickSize: 0.01,
        contractSize: null,
        isActive: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(api.api.get).mockResolvedValue({ data: instrument });

      const store = useInstrumentsStore();
      const result = await store.findByTicker('BINANCE:BTCUSDT');

      expect(api.api.get).toHaveBeenCalledWith(
        '/instruments/ticker/BINANCE%3ABTCUSDT',
      );
      expect(result).toEqual(instrument);
    });
  });

  describe('Getters', () => {
    it('debería filtrar instrumentos activos', () => {
      const store = useInstrumentsStore();
      store.instruments = [
        {
          id: '1',
          userId: 'user-1',
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          ticker: 'BINANCE:BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO' as const,
          currencyQuote: 'USDT',
          tickSize: 0.01,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          market: 'NASDAQ',
          symbol: 'AAPL',
          ticker: 'NASDAQ:AAPL',
          name: 'Apple Inc.',
          type: 'STOCK' as const,
          currencyQuote: 'USD',
          tickSize: null,
          contractSize: null,
          isActive: false,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.activeInstruments).toHaveLength(1);
      expect(store.activeInstruments[0].id).toBe('1');
    });

    it('debería agrupar instrumentos por tipo', () => {
      const store = useInstrumentsStore();
      store.instruments = [
        {
          id: '1',
          userId: 'user-1',
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          ticker: 'BINANCE:BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO' as const,
          currencyQuote: 'USDT',
          tickSize: 0.01,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          market: 'NASDAQ',
          symbol: 'AAPL',
          ticker: 'NASDAQ:AAPL',
          name: 'Apple Inc.',
          type: 'STOCK' as const,
          currencyQuote: 'USD',
          tickSize: null,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.instrumentsByType.CRYPTO).toHaveLength(1);
      expect(store.instrumentsByType.STOCK).toHaveLength(1);
    });

    it('debería agrupar instrumentos por market', () => {
      const store = useInstrumentsStore();
      store.instruments = [
        {
          id: '1',
          userId: 'user-1',
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          ticker: 'BINANCE:BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO' as const,
          currencyQuote: 'USDT',
          tickSize: 0.01,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          market: 'BINANCE',
          symbol: 'ETHUSDT',
          ticker: 'BINANCE:ETHUSDT',
          name: 'Ethereum',
          type: 'CRYPTO' as const,
          currencyQuote: 'USDT',
          tickSize: 0.01,
          contractSize: null,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      expect(store.instrumentsByMarket.BINANCE).toHaveLength(2);
    });
  });
});


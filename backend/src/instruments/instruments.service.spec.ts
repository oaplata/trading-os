import { Test, TestingModule } from '@nestjs/testing';
import { InstrumentsService } from './instruments.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InstrumentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock de PrismaService
const mockPrismaService = {
  instrument: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('InstrumentsService', () => {
  let service: InstrumentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InstrumentsService>(InstrumentsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const userId = 'user-id';
  const instrumentId = 'instrument-id';
  const mockInstrument = {
    id: instrumentId,
    userId,
    market: 'BINANCE',
    symbol: 'BTCUSDT',
    ticker: 'BINANCE:BTCUSDT',
    name: 'Bitcoin',
    type: InstrumentType.CRYPTO,
    currencyQuote: 'USDT',
    tickSize: new Decimal(0.01),
    contractSize: null,
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    const createDto = {
      market: 'BINANCE',
      symbol: 'BTCUSDT',
      name: 'Bitcoin',
      type: InstrumentType.CRYPTO,
      currencyQuote: 'USDT',
      tickSize: 0.01,
    };

    it('debería crear instrumento exitosamente', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(null);
      mockPrismaService.instrument.create.mockResolvedValue(mockInstrument);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: {
          userId_ticker: {
            userId,
            ticker: 'BINANCE:BTCUSDT',
          },
        },
      });
      expect(mockPrismaService.instrument.create).toHaveBeenCalledWith({
        data: {
          userId,
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          ticker: 'BINANCE:BTCUSDT',
          name: 'Bitcoin',
          type: InstrumentType.CRYPTO,
          currencyQuote: 'USDT',
          tickSize: new Decimal(0.01),
          contractSize: null,
          notes: null,
          isActive: true,
        },
      });
      expect(result.ticker).toBe('BINANCE:BTCUSDT');
      expect(result.tickSize).toBe(0.01);
    });

    it('debería normalizar market y symbol a uppercase', async () => {
      // Arrange
      const createDtoLower = {
        ...createDto,
        market: 'binance',
        symbol: 'btcusdt',
      };
      mockPrismaService.instrument.findUnique.mockResolvedValue(null);
      mockPrismaService.instrument.create.mockResolvedValue(mockInstrument);

      // Act
      await service.create(userId, createDtoLower);

      // Assert
      expect(mockPrismaService.instrument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            market: 'BINANCE',
            symbol: 'BTCUSDT',
            ticker: 'BINANCE:BTCUSDT',
          }),
        }),
      );
    });

    it('debería lanzar ConflictException si el ticker ya existe', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.instrument.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debería listar instrumentos con paginación', async () => {
      // Arrange
      const query = { page: 1, limit: 50 };
      mockPrismaService.instrument.count.mockResolvedValue(1);
      mockPrismaService.instrument.findMany.mockResolvedValue([mockInstrument]);

      // Act
      const result = await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.instrument.count).toHaveBeenCalled();
      expect(mockPrismaService.instrument.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('debería aplicar filtros correctamente', async () => {
      // Arrange
      const query = {
        market: 'BINANCE',
        type: InstrumentType.CRYPTO,
        isActive: true,
        page: 1,
        limit: 50,
      };
      mockPrismaService.instrument.count.mockResolvedValue(1);
      mockPrismaService.instrument.findMany.mockResolvedValue([mockInstrument]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.instrument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            market: 'BINANCE',
            type: InstrumentType.CRYPTO,
            isActive: true,
          }),
        }),
      );
    });

    it('debería buscar en name, symbol y ticker', async () => {
      // Arrange
      const query = { search: 'BTC', page: 1, limit: 50 };
      mockPrismaService.instrument.count.mockResolvedValue(1);
      mockPrismaService.instrument.findMany.mockResolvedValue([mockInstrument]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.instrument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'BTC', mode: 'insensitive' } },
              { symbol: { contains: 'BTC' } },
              { ticker: { contains: 'BTC' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería obtener instrumento por ID', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);

      // Act
      const result = await service.findOne(instrumentId, userId);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: { id: instrumentId },
      });
      expect(result.id).toBe(instrumentId);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(instrumentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ForbiddenException si no pertenece al usuario', async () => {
      // Arrange
      const otherUserInstrument = { ...mockInstrument, userId: 'other-user-id' };
      mockPrismaService.instrument.findUnique.mockResolvedValue(otherUserInstrument);

      // Act & Assert
      await expect(service.findOne(instrumentId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByTicker', () => {
    it('debería buscar instrumento por ticker', async () => {
      // Arrange
      const ticker = 'BINANCE:BTCUSDT';
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);

      // Act
      const result = await service.findByTicker(ticker, userId);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: {
          userId_ticker: {
            userId,
            ticker: 'BINANCE:BTCUSDT',
          },
        },
      });
      expect(result.ticker).toBe('BINANCE:BTCUSDT');
    });

    it('debería normalizar ticker a uppercase', async () => {
      // Arrange
      const ticker = 'binance:btcusdt';
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);

      // Act
      await service.findByTicker(ticker, userId);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: {
          userId_ticker: {
            userId,
            ticker: 'BINANCE:BTCUSDT',
          },
        },
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByTicker('BINANCE:BTCUSDT', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Bitcoin',
      type: InstrumentType.CRYPTO,
    };

    it('debería actualizar instrumento correctamente', async () => {
      // Arrange
      const updatedInstrument = { ...mockInstrument, ...updateDto };
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrismaService.instrument.update.mockResolvedValue(updatedInstrument);

      // Act
      const result = await service.update(instrumentId, userId, updateDto);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: { id: instrumentId },
      });
      expect(mockPrismaService.instrument.update).toHaveBeenCalledWith({
        where: { id: instrumentId },
        data: expect.objectContaining(updateDto),
      });
      expect(result.name).toBe('Updated Bitcoin');
    });

    it('debería normalizar currencyQuote a uppercase', async () => {
      // Arrange
      const updateDtoWithCurrency = { currencyQuote: 'usd' };
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrismaService.instrument.update.mockResolvedValue({
        ...mockInstrument,
        currencyQuote: 'USD',
      });

      // Act
      await service.update(instrumentId, userId, updateDtoWithCurrency);

      // Assert
      expect(mockPrismaService.instrument.update).toHaveBeenCalledWith({
        where: { id: instrumentId },
        data: expect.objectContaining({
          currencyQuote: 'USD',
        }),
      });
    });

    it('debería rechazar si instrumento no pertenece al usuario', async () => {
      // Arrange
      const otherUserInstrument = { ...mockInstrument, userId: 'other-user-id' };
      mockPrismaService.instrument.findUnique.mockResolvedValue(otherUserInstrument);

      // Act & Assert
      await expect(service.update(instrumentId, userId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.instrument.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      // Arrange
      mockPrismaService.instrument.findUnique.mockResolvedValue(mockInstrument);
      mockPrismaService.instrument.update.mockResolvedValue({
        ...mockInstrument,
        isActive: false,
      });

      // Act
      await service.delete(instrumentId, userId);

      // Assert
      expect(mockPrismaService.instrument.findUnique).toHaveBeenCalledWith({
        where: { id: instrumentId },
      });
      expect(mockPrismaService.instrument.update).toHaveBeenCalledWith({
        where: { id: instrumentId },
        data: { isActive: false },
      });
    });

    it('debería rechazar si instrumento no pertenece al usuario', async () => {
      // Arrange
      const otherUserInstrument = { ...mockInstrument, userId: 'other-user-id' };
      mockPrismaService.instrument.findUnique.mockResolvedValue(otherUserInstrument);

      // Act & Assert
      await expect(service.delete(instrumentId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.instrument.update).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('debería buscar instrumentos con límite', async () => {
      // Arrange
      const query = 'BTC';
      mockPrismaService.instrument.findMany.mockResolvedValue([mockInstrument]);

      // Act
      const result = await service.search(userId, query, 10);

      // Assert
      expect(mockPrismaService.instrument.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          OR: expect.arrayContaining([
            { name: { contains: 'BTC', mode: 'insensitive' } },
            { symbol: { contains: 'BTC' } },
            { ticker: { contains: 'BTC' } },
          ]),
        },
        orderBy: [
          { name: 'asc' },
          { ticker: 'asc' },
        ],
        take: 10,
      });
      expect(result).toHaveLength(1);
    });

    it('debería retornar array vacío si query está vacío', async () => {
      // Act
      const result = await service.search(userId, '', 10);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrismaService.instrument.findMany).not.toHaveBeenCalled();
    });
  });
});


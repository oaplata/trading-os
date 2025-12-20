import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

// Mock de PrismaService
const mockPrismaService = {
  strategy: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('StrategiesService', () => {
  let service: StrategiesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategiesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StrategiesService>(StrategiesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const userId = 'user-id';
  const strategyId = 'strategy-id';
  const mockStrategy = {
    id: strategyId,
    userId,
    name: 'Swing Trading Crypto',
    description: 'Estrategia de swing trading',
    targetMarket: 'CRYPTO',
    typicalTimeframe: '4H',
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      setups: 3,
    },
  };

  describe('create', () => {
    const createDto = {
      name: 'Swing Trading Crypto',
      description: 'Estrategia de swing trading',
      targetMarket: 'CRYPTO',
      typicalTimeframe: '4H',
    };

    it('debería crear estrategia exitosamente', async () => {
      // Arrange
      mockPrismaService.strategy.create.mockResolvedValue(mockStrategy);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: 'Swing Trading Crypto',
          description: 'Estrategia de swing trading',
          targetMarket: 'CRYPTO',
          typicalTimeframe: '4H',
          notes: null,
          isActive: true,
        },
      });
      expect(result.name).toBe('Swing Trading Crypto');
    });

    it('debería manejar campos opcionales como null', async () => {
      // Arrange
      const createDtoMinimal = { name: 'Minimal Strategy' };
      mockPrismaService.strategy.create.mockResolvedValue({
        ...mockStrategy,
        description: null,
        targetMarket: null,
        typicalTimeframe: null,
      });

      // Act
      await service.create(userId, createDtoMinimal);

      // Assert
      expect(mockPrismaService.strategy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
          targetMarket: null,
          typicalTimeframe: null,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('debería listar estrategias con paginación', async () => {
      // Arrange
      const query = { page: 1, limit: 50 };
      mockPrismaService.strategy.count.mockResolvedValue(1);
      mockPrismaService.strategy.findMany.mockResolvedValue([mockStrategy]);

      // Act
      const result = await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.strategy.count).toHaveBeenCalled();
      expect(mockPrismaService.strategy.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.data[0].setupCount).toBe(3);
    });

    it('debería aplicar filtros correctamente', async () => {
      // Arrange
      const query = {
        targetMarket: 'CRYPTO',
        isActive: true,
        page: 1,
        limit: 50,
      };
      mockPrismaService.strategy.count.mockResolvedValue(1);
      mockPrismaService.strategy.findMany.mockResolvedValue([mockStrategy]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.strategy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            targetMarket: 'CRYPTO',
            isActive: true,
          }),
        }),
      );
    });

    it('debería buscar en name y description', async () => {
      // Arrange
      const query = { search: 'swing', page: 1, limit: 50 };
      mockPrismaService.strategy.count.mockResolvedValue(1);
      mockPrismaService.strategy.findMany.mockResolvedValue([mockStrategy]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.strategy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'swing', mode: 'insensitive' } },
              { description: { contains: 'swing', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería obtener estrategia por ID', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);

      // Act
      const result = await service.findOne(strategyId, userId);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: strategyId },
        include: {
          _count: {
            select: { setups: true },
          },
        },
      });
      expect(result.id).toBe(strategyId);
      expect(result.setupCount).toBe(3);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(strategyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ForbiddenException si no pertenece al usuario', async () => {
      // Arrange
      const otherUserStrategy = { ...mockStrategy, userId: 'other-user-id' };
      mockPrismaService.strategy.findUnique.mockResolvedValue(otherUserStrategy);

      // Act & Assert
      await expect(service.findOne(strategyId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateStrategyDto = {
      name: 'Updated Strategy',
      description: 'Updated description',
    };

    it('debería actualizar estrategia correctamente', async () => {
      // Arrange
      const updatedStrategy = { ...mockStrategy, ...updateDto };
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.update.mockResolvedValue({
        ...updatedStrategy,
        _count: { setups: 3 },
      });

      // Act
      const result = await service.update(strategyId, userId, updateDto);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: strategyId },
      });
      expect(mockPrismaService.strategy.update).toHaveBeenCalledWith({
        where: { id: strategyId },
        data: expect.objectContaining({
          name: 'Updated Strategy',
          description: 'Updated description',
        }),
        include: {
          _count: {
            select: { setups: true },
          },
        },
      });
      expect(result.name).toBe('Updated Strategy');
    });

    it('debería rechazar si estrategia no pertenece al usuario', async () => {
      // Arrange
      const otherUserStrategy = { ...mockStrategy, userId: 'other-user-id' };
      mockPrismaService.strategy.findUnique.mockResolvedValue(otherUserStrategy);

      // Act & Assert
      await expect(service.update(strategyId, userId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.strategy.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.update.mockResolvedValue({
        ...mockStrategy,
        isActive: false,
      });

      // Act
      await service.delete(strategyId, userId);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: strategyId },
      });
      expect(mockPrismaService.strategy.update).toHaveBeenCalledWith({
        where: { id: strategyId },
        data: { isActive: false },
      });
    });

    it('debería rechazar si estrategia no pertenece al usuario', async () => {
      // Arrange
      const otherUserStrategy = { ...mockStrategy, userId: 'other-user-id' };
      mockPrismaService.strategy.findUnique.mockResolvedValue(otherUserStrategy);

      // Act & Assert
      await expect(service.delete(strategyId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.strategy.update).not.toHaveBeenCalled();
    });
  });

  describe('getSetupCount', () => {
    it('debería contar setups asociados', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);

      // Act
      const count = await service.getSetupCount(strategyId, userId);

      // Assert
      expect(count).toBe(3);
    });
  });
});


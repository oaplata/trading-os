import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SetupsService } from './setups.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSetupDto } from './dto/update-setup.dto';

// Mock de PrismaService
const mockPrismaService = {
  strategy: {
    findUnique: jest.fn(),
  },
  setup: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('SetupsService', () => {
  let service: SetupsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SetupsService>(SetupsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const userId = 'user-id';
  const setupId = 'setup-id';
  const strategyId = 'strategy-id';
  const mockSetup = {
    id: setupId,
    userId,
    strategyId,
    name: 'Breakout',
    description: 'Setup de breakout',
    suggestedTags: ['breakout', 'momentum'],
    isActive: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    strategy: {
      id: strategyId,
      name: 'Swing Trading Crypto',
    },
    _count: {
      rules: 5,
    },
  };

  describe('create', () => {
    const createDto = {
      strategyId,
      name: 'Breakout',
      description: 'Setup de breakout',
      suggestedTags: ['breakout', 'momentum'],
    };

    it('debería crear setup exitosamente', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue({
        id: strategyId,
        userId,
      });
      mockPrismaService.setup.create.mockResolvedValue(mockSetup);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: strategyId },
      });
      expect(mockPrismaService.setup.create).toHaveBeenCalledWith({
        data: {
          userId,
          strategyId,
          name: 'Breakout',
          description: 'Setup de breakout',
          suggestedTags: ['breakout', 'momentum'],
          notes: null,
          isActive: true,
        },
        include: {
          strategy: true,
          _count: {
            select: { rules: true },
          },
        },
      });
      expect(result.name).toBe('Breakout');
      expect(result.ruleCount).toBe(5);
    });

    it('debería crear setup sin estrategia si strategyId no se proporciona', async () => {
      // Arrange
      const createDtoNoStrategy = {
        name: 'Standalone Setup',
        description: 'Setup sin estrategia',
      };
      mockPrismaService.setup.create.mockResolvedValue({
        ...mockSetup,
        strategyId: null,
        strategy: null,
      });

      // Act
      await service.create(userId, createDtoNoStrategy);

      // Assert
      expect(mockPrismaService.strategy.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.setup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          strategyId: null,
        }),
        include: {
          strategy: true,
          _count: {
            select: { rules: true },
          },
        },
      });
    });

    it('debería rechazar si strategyId no existe', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.setup.create).not.toHaveBeenCalled();
    });

    it('debería rechazar si strategyId no pertenece al usuario', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue({
        id: strategyId,
        userId: 'other-user-id',
      });

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.setup.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debería listar setups con paginación', async () => {
      // Arrange
      const query = { page: 1, limit: 50 };
      mockPrismaService.setup.count.mockResolvedValue(1);
      mockPrismaService.setup.findMany.mockResolvedValue([mockSetup]);

      // Act
      const result = await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.setup.count).toHaveBeenCalled();
      expect(mockPrismaService.setup.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('debería filtrar por strategyId', async () => {
      // Arrange
      const query = { strategyId, page: 1, limit: 50 };
      mockPrismaService.setup.count.mockResolvedValue(1);
      mockPrismaService.setup.findMany.mockResolvedValue([mockSetup]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.setup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            strategyId,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería obtener setup por ID con reglas ordenadas', async () => {
      // Arrange
      const mockRules = [
        { id: 'rule-1', order: 0, name: 'Rule 1' },
        { id: 'rule-2', order: 1, name: 'Rule 2' },
      ];
      mockPrismaService.setup.findUnique.mockResolvedValue({
        ...mockSetup,
        rules: mockRules,
      });

      // Act
      const result = await service.findOne(setupId, userId);

      // Assert
      expect(mockPrismaService.setup.findUnique).toHaveBeenCalledWith({
        where: { id: setupId },
        include: {
          strategy: true,
          rules: {
            where: { isActive: true },
            orderBy: [
              { order: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          _count: {
            select: { rules: true },
          },
        },
      });
      expect(result.id).toBe(setupId);
      expect(result.rules).toEqual(mockRules);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(setupId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ForbiddenException si no pertenece al usuario', async () => {
      // Arrange
      const otherUserSetup = { ...mockSetup, userId: 'other-user-id' };
      mockPrismaService.setup.findUnique.mockResolvedValue(otherUserSetup);

      // Act & Assert
      await expect(service.findOne(setupId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByStrategy', () => {
    it('debería listar setups de una estrategia', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue({
        id: strategyId,
        userId,
      });
      mockPrismaService.setup.findMany.mockResolvedValue([mockSetup]);

      // Act
      const result = await service.findByStrategy(strategyId, userId);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: strategyId },
      });
      expect(mockPrismaService.setup.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          strategyId,
          isActive: true,
        },
        include: {
          _count: {
            select: { rules: true },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { name: 'asc' },
        ],
      });
      expect(result).toHaveLength(1);
    });

    it('debería rechazar si estrategia no pertenece al usuario', async () => {
      // Arrange
      mockPrismaService.strategy.findUnique.mockResolvedValue({
        id: strategyId,
        userId: 'other-user-id',
      });

      // Act & Assert
      await expect(service.findByStrategy(strategyId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateSetupDto = {
      name: 'Updated Breakout',
      suggestedTags: ['breakout', 'updated'],
    };

    it('debería actualizar setup correctamente', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue(mockSetup);
      mockPrismaService.setup.update.mockResolvedValue({
        ...mockSetup,
        ...updateDto,
        _count: { rules: 5 },
      });

      // Act
      const result = await service.update(setupId, userId, updateDto);

      // Assert
      expect(mockPrismaService.setup.findUnique).toHaveBeenCalledWith({
        where: { id: setupId },
      });
      expect(mockPrismaService.setup.update).toHaveBeenCalledWith({
        where: { id: setupId },
        data: expect.objectContaining(updateDto),
        include: {
          strategy: true,
          _count: {
            select: { rules: true },
          },
        },
      });
      expect(result.name).toBe('Updated Breakout');
    });

    it('debería validar nuevo strategyId si se proporciona', async () => {
      // Arrange
      const newStrategyId = 'new-strategy-id';
      const updateDtoWithStrategy: UpdateSetupDto = {
        strategyId: newStrategyId,
      };
      mockPrismaService.setup.findUnique.mockResolvedValue(mockSetup);
      mockPrismaService.strategy.findUnique.mockResolvedValue({
        id: newStrategyId,
        userId,
      });
      mockPrismaService.setup.update.mockResolvedValue({
        ...mockSetup,
        strategyId: newStrategyId,
        _count: { rules: 5 },
      });

      // Act
      await service.update(setupId, userId, updateDtoWithStrategy);

      // Assert
      expect(mockPrismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: newStrategyId },
      });
    });
  });

  describe('delete', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue(mockSetup);
      mockPrismaService.setup.update.mockResolvedValue({
        ...mockSetup,
        isActive: false,
      });

      // Act
      await service.delete(setupId, userId);

      // Assert
      expect(mockPrismaService.setup.update).toHaveBeenCalledWith({
        where: { id: setupId },
        data: { isActive: false },
      });
    });
  });
});


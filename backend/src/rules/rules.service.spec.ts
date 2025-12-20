import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RulesService } from './rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';

// Mock de PrismaService
const mockPrismaService = {
  setup: {
    findUnique: jest.fn(),
  },
  rule: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('RulesService', () => {
  let service: RulesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const userId = 'user-id';
  const ruleId = 'rule-id';
  const setupId = 'setup-id';
  const mockRule = {
    id: ruleId,
    userId,
    setupId,
    name: 'Price above EMA 20',
    description: 'El precio debe estar por encima de la EMA 20',
    order: 0,
    isRequired: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    const createDto = {
      setupId,
      name: 'Price above EMA 20',
      description: 'El precio debe estar por encima de la EMA 20',
      order: 0,
      isRequired: false,
    };

    it('debería crear regla exitosamente', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId,
      });
      mockPrismaService.rule.create.mockResolvedValue(mockRule);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.setup.findUnique).toHaveBeenCalledWith({
        where: { id: setupId },
      });
      expect(mockPrismaService.rule.create).toHaveBeenCalledWith({
        data: {
          userId,
          setupId,
          name: 'Price above EMA 20',
          description: 'El precio debe estar por encima de la EMA 20',
          order: 0,
          isRequired: false,
          isActive: true,
        },
      });
      expect(result.name).toBe('Price above EMA 20');
    });

    it('debería usar valores por defecto para order e isRequired', async () => {
      // Arrange
      const createDtoMinimal = {
        setupId,
        name: 'Minimal Rule',
      };
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId,
      });
      mockPrismaService.rule.create.mockResolvedValue({
        ...mockRule,
        order: 0,
        isRequired: false,
      });

      // Act
      await service.create(userId, createDtoMinimal);

      // Assert
      expect(mockPrismaService.rule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 0,
          isRequired: false,
        }),
      });
    });

    it('debería rechazar si setupId no existe', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.rule.create).not.toHaveBeenCalled();
    });

    it('debería rechazar si setupId no pertenece al usuario', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId: 'other-user-id',
      });

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.rule.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debería listar reglas ordenadas por order', async () => {
      // Arrange
      const query = {};
      const mockRules = [
        { ...mockRule, id: 'rule-1', order: 0 },
        { ...mockRule, id: 'rule-2', order: 1 },
        { ...mockRule, id: 'rule-3', order: 2 },
      ];
      mockPrismaService.rule.findMany.mockResolvedValue(mockRules);

      // Act
      const result = await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.rule.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' },
        ],
      });
      expect(result).toHaveLength(3);
    });

    it('debería filtrar por setupId', async () => {
      // Arrange
      const query = { setupId };
      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.rule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            setupId,
          }),
        }),
      );
    });

    it('debería filtrar por isRequired', async () => {
      // Arrange
      const query = { isRequired: true };
      mockPrismaService.rule.findMany.mockResolvedValue([
        { ...mockRule, isRequired: true },
      ]);

      // Act
      await service.findAll(userId, query);

      // Assert
      expect(mockPrismaService.rule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            isRequired: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería obtener regla por ID', async () => {
      // Arrange
      mockPrismaService.rule.findUnique.mockResolvedValue(mockRule);

      // Act
      const result = await service.findOne(ruleId, userId);

      // Assert
      expect(mockPrismaService.rule.findUnique).toHaveBeenCalledWith({
        where: { id: ruleId },
      });
      expect(result.id).toBe(ruleId);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      // Arrange
      mockPrismaService.rule.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(ruleId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ForbiddenException si no pertenece al usuario', async () => {
      // Arrange
      const otherUserRule = { ...mockRule, userId: 'other-user-id' };
      mockPrismaService.rule.findUnique.mockResolvedValue(otherUserRule);

      // Act & Assert
      await expect(service.findOne(ruleId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findBySetup', () => {
    it('debería listar reglas de un setup ordenadas', async () => {
      // Arrange
      const mockRules = [
        { ...mockRule, id: 'rule-1', order: 0 },
        { ...mockRule, id: 'rule-2', order: 1 },
      ];
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId,
      });
      mockPrismaService.rule.findMany.mockResolvedValue(mockRules);

      // Act
      const result = await service.findBySetup(setupId, userId);

      // Assert
      expect(mockPrismaService.setup.findUnique).toHaveBeenCalledWith({
        where: { id: setupId },
      });
      expect(mockPrismaService.rule.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          setupId,
          isActive: true,
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    const updateDto: UpdateRuleDto = {
      name: 'Updated Rule',
      order: 1,
      isRequired: true,
    };

    it('debería actualizar regla correctamente', async () => {
      // Arrange
      mockPrismaService.rule.findUnique.mockResolvedValue(mockRule);
      mockPrismaService.rule.update.mockResolvedValue({
        ...mockRule,
        ...updateDto,
      });

      // Act
      const result = await service.update(ruleId, userId, updateDto);

      // Assert
      expect(mockPrismaService.rule.findUnique).toHaveBeenCalledWith({
        where: { id: ruleId },
      });
      expect(mockPrismaService.rule.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: expect.objectContaining(updateDto),
      });
      expect(result.name).toBe('Updated Rule');
      expect(result.order).toBe(1);
      expect(result.isRequired).toBe(true);
    });

    it('no debería permitir cambiar setupId', async () => {
      // Arrange
      const updateDtoWithSetupId = {
        ...updateDto,
        setupId: 'new-setup-id',
      } as any;
      mockPrismaService.rule.findUnique.mockResolvedValue(mockRule);
      mockPrismaService.rule.update.mockResolvedValue(mockRule);

      // Act
      await service.update(ruleId, userId, updateDtoWithSetupId);

      // Assert
      expect(mockPrismaService.rule.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: expect.not.objectContaining({
          setupId: 'new-setup-id',
        }),
      });
    });
  });

  describe('delete', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      // Arrange
      mockPrismaService.rule.findUnique.mockResolvedValue(mockRule);
      mockPrismaService.rule.update.mockResolvedValue({
        ...mockRule,
        isActive: false,
      });

      // Act
      await service.delete(ruleId, userId);

      // Assert
      expect(mockPrismaService.rule.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: { isActive: false },
      });
    });
  });

  describe('reorder', () => {
    const reorderDto: ReorderRulesDto = {
      setupId,
      ruleIds: ['rule-1', 'rule-2', 'rule-3'],
    };

    it('debería reordenar reglas correctamente', async () => {
      // Arrange
      const mockRules = [
        { ...mockRule, id: 'rule-1' },
        { ...mockRule, id: 'rule-2' },
        { ...mockRule, id: 'rule-3' },
      ];
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId,
      });
      mockPrismaService.rule.findMany.mockResolvedValue(mockRules);
      mockPrismaService.rule.update.mockResolvedValue(mockRule);
      mockPrismaService.rule.findMany.mockResolvedValueOnce(mockRules);

      // Act
      const result = await service.reorder(userId, reorderDto);

      // Assert
      expect(mockPrismaService.setup.findUnique).toHaveBeenCalledWith({
        where: { id: setupId },
      });
      expect(mockPrismaService.rule.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: reorderDto.ruleIds },
          userId,
          setupId,
        },
      });
      expect(mockPrismaService.rule.update).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('debería rechazar si algunas reglas no existen o no pertenecen al setup', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId,
      });
      mockPrismaService.rule.findMany.mockResolvedValue([
        { ...mockRule, id: 'rule-1' },
        // Solo 1 regla encontrada de 3
      ]);

      // Act & Assert
      await expect(service.reorder(userId, reorderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar si setup no pertenece al usuario', async () => {
      // Arrange
      mockPrismaService.setup.findUnique.mockResolvedValue({
        id: setupId,
        userId: 'other-user-id',
      });

      // Act & Assert
      await expect(service.reorder(userId, reorderDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});


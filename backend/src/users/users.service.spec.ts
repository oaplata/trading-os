import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock de PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  userSettings: {
    upsert: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('debería encontrar un usuario por email', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        email,
        settings: {
          timezone: 'America/Bogota',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { settings: true },
      });
    });

    it('debería retornar null si el usuario no existe', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('debería encontrar un usuario por ID', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        settings: {
          timezone: 'America/Bogota',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { settings: true },
      });
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent-id';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(userId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateSettings', () => {
    it('debería actualizar settings existentes', async () => {
      // Arrange
      const userId = 'user-id';
      const settings = {
        timezone: 'America/New_York',
        baseCurrency: 'USD',
      };
      const mockSettings = {
        id: 'settings-id',
        userId,
        ...settings,
      };

      mockPrismaService.userSettings.upsert.mockResolvedValue(
        mockSettings as any,
      );

      // Act
      const result = await service.updateSettings(userId, settings);

      // Assert
      expect(result).toEqual(mockSettings);
      expect(mockPrismaService.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: settings,
        create: {
          userId,
          ...settings,
        },
      });
    });

    it('debería crear settings si no existen', async () => {
      // Arrange
      const userId = 'user-id';
      const settings = {
        timezone: 'America/Bogota',
        baseCurrency: 'COP',
      };
      const mockSettings = {
        id: 'settings-id',
        userId,
        ...settings,
      };

      mockPrismaService.userSettings.upsert.mockResolvedValue(
        mockSettings as any,
      );

      // Act
      const result = await service.updateSettings(userId, settings);

      // Assert
      expect(result).toEqual(mockSettings);
    });
  });
});


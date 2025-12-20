import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CashflowsService } from './cashflows.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { CashflowType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock de PrismaService
const mockPrismaService = {
  account: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  cashflow: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Mock de AccountsService
const mockAccountsService = {
  calculateBalance: jest.fn(),
  getTotalCashflows: jest.fn(),
};

describe('CashflowsService', () => {
  let service: CashflowsService;
  let prismaService: PrismaService;
  let accountsService: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashflowsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AccountsService,
          useValue: mockAccountsService,
        },
      ],
    }).compile();

    service = module.get<CashflowsService>(CashflowsService);
    prismaService = module.get<PrismaService>(PrismaService);
    accountsService = module.get<AccountsService>(AccountsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-id';
    const accountId = 'account-id';
    const otherUserId = 'other-user-id';

    const mockAccount = {
      id: accountId,
      userId,
      currency: 'USD',
      name: 'Test Account',
    };

    const createDto: CreateCashflowDto = {
      accountId,
      type: CashflowType.DEPOSIT,
      amount: 1000,
      currency: 'USD',
      description: 'Test deposit',
      date: '2024-01-15T10:00:00Z',
    };

    it('debería crear cashflow correctamente', async () => {
      // Arrange
      const mockCashflow = {
        id: 'cashflow-id',
        accountId,
        userId,
        type: createDto.type,
        amount: new Decimal(createDto.amount),
        currency: createDto.currency,
        description: createDto.description,
        date: new Date(createDto.date),
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        account: {
          id: accountId,
          name: 'Test Account',
        },
      };

      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      mockPrismaService.cashflow.create.mockResolvedValue(mockCashflow);
      mockAccountsService.calculateBalance.mockResolvedValue(2000);
      mockPrismaService.account.update.mockResolvedValue({});

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: accountId },
      });
      expect(mockPrismaService.cashflow.create).toHaveBeenCalled();
      expect(mockAccountsService.calculateBalance).toHaveBeenCalledWith(accountId);
      expect(result.amount).toBe(1000);
    });

    it('debería validar moneda coincide con cuenta', async () => {
      // Arrange
      const accountWithDifferentCurrency = {
        ...mockAccount,
        currency: 'COP',
      };
      mockPrismaService.account.findUnique.mockResolvedValue(accountWithDifferentCurrency);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrismaService.cashflow.create).not.toHaveBeenCalled();
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      // Arrange
      const otherUserAccount = {
        ...mockAccount,
        userId: otherUserId,
      };
      mockPrismaService.account.findUnique.mockResolvedValue(otherUserAccount);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrismaService.cashflow.create).not.toHaveBeenCalled();
    });

    it('debería validar que la fecha no sea futura', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDto = {
        ...createDto,
        date: futureDate.toISOString(),
      };
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.create(userId, futureDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAll', () => {
    const userId = 'user-id';

    it('debería aplicar filtros correctamente', async () => {
      // Arrange
      const filters = {
        accountId: 'account-id',
        type: CashflowType.DEPOSIT,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        limit: 10,
      };

      const mockCashflows = [
        {
          id: 'cf-1',
          accountId: 'account-id',
          userId,
          type: CashflowType.DEPOSIT,
          amount: new Decimal(1000),
          currency: 'USD',
          date: new Date('2024-01-15'),
          account: { id: 'account-id', name: 'Test Account' },
        },
      ];

      mockPrismaService.cashflow.count.mockResolvedValue(1);
      mockPrismaService.cashflow.findMany.mockResolvedValue(mockCashflows);

      // Act
      const result = await service.findAll(userId, filters);

      // Assert
      expect(mockPrismaService.cashflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            accountId: filters.accountId,
            type: filters.type,
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          skip: 0,
          take: 10,
        })
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('debería paginar correctamente', async () => {
      // Arrange
      const filters = { page: 2, limit: 10 };
      mockPrismaService.cashflow.count.mockResolvedValue(25);
      mockPrismaService.cashflow.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll(userId, filters);

      // Assert
      expect(mockPrismaService.cashflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        })
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('update', () => {
    const userId = 'user-id';
    const cashflowId = 'cashflow-id';
    const accountId = 'account-id';

    const mockCashflow = {
      id: cashflowId,
      accountId,
      userId,
      type: CashflowType.DEPOSIT,
      amount: new Decimal(1000),
      currency: 'USD',
      date: new Date(),
      account: { id: accountId, name: 'Test Account' },
    };

    it('debería actualizar cashflow correctamente', async () => {
      // Arrange
      const updateDto: UpdateCashflowDto = {
        amount: 1500,
        description: 'Updated description',
      };
      const updatedCashflow = {
        ...mockCashflow,
        amount: new Decimal(updateDto.amount),
        description: updateDto.description,
      };

      mockPrismaService.cashflow.findUnique.mockResolvedValue(mockCashflow);
      mockPrismaService.account.findUnique.mockResolvedValue({
        currency: 'USD',
      });
      mockPrismaService.cashflow.update.mockResolvedValue(updatedCashflow);
      mockAccountsService.calculateBalance.mockResolvedValue(2000);
      mockPrismaService.account.update.mockResolvedValue({});

      // Act
      const result = await service.update(cashflowId, userId, updateDto);

      // Assert
      expect(mockPrismaService.cashflow.update).toHaveBeenCalled();
      expect(result.amount).toBe(1500);
      expect(mockAccountsService.calculateBalance).toHaveBeenCalledWith(accountId);
    });

    it('debería validar moneda si se actualiza', async () => {
      // Arrange
      const updateDto: UpdateCashflowDto = {
        currency: 'COP',
      };
      mockPrismaService.cashflow.findUnique.mockResolvedValue(mockCashflow);
      mockPrismaService.account.findUnique.mockResolvedValue({
        currency: 'USD',
      });

      // Act & Assert
      await expect(service.update(cashflowId, userId, updateDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('delete', () => {
    const userId = 'user-id';
    const cashflowId = 'cashflow-id';
    const accountId = 'account-id';

    const mockCashflow = {
      id: cashflowId,
      accountId,
      userId,
      type: CashflowType.DEPOSIT,
      amount: new Decimal(1000),
      currency: 'USD',
      date: new Date(),
      account: { id: accountId, name: 'Test Account' },
    };

    it('debería eliminar cashflow correctamente', async () => {
      // Arrange
      mockPrismaService.cashflow.findUnique.mockResolvedValue(mockCashflow);
      mockPrismaService.cashflow.delete.mockResolvedValue(mockCashflow);
      mockAccountsService.calculateBalance.mockResolvedValue(1000);
      mockPrismaService.account.update.mockResolvedValue({});

      // Act
      const result = await service.delete(cashflowId, userId);

      // Assert
      expect(mockPrismaService.cashflow.delete).toHaveBeenCalledWith({
        where: { id: cashflowId },
      });
      expect(mockAccountsService.calculateBalance).toHaveBeenCalledWith(accountId);
      expect(result.message).toBe('Cashflow deleted successfully');
    });

    it('debería rechazar si cashflow no pertenece al usuario', async () => {
      // Arrange
      const otherUserCashflow = {
        ...mockCashflow,
        userId: 'other-user-id',
      };
      mockPrismaService.cashflow.findUnique.mockResolvedValue(otherUserCashflow);

      // Act & Assert
      await expect(service.delete(cashflowId, userId)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrismaService.cashflow.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTotalByAccount', () => {
    const userId = 'user-id';
    const accountId = 'account-id';

    it('debería calcular totales correctamente', async () => {
      // Arrange
      const mockAccount = {
        id: accountId,
        userId,
        currency: 'USD',
      };
      const expectedTotal = 500;

      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      mockAccountsService.getTotalCashflows.mockResolvedValue(expectedTotal);

      // Act
      const result = await service.getTotalByAccount(accountId, userId);

      // Assert
      expect(mockAccountsService.getTotalCashflows).toHaveBeenCalledWith(accountId);
      expect(result).toBe(expectedTotal);
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      // Arrange
      const otherUserAccount = {
        id: accountId,
        userId: 'other-user-id',
        currency: 'USD',
      };
      mockPrismaService.account.findUnique.mockResolvedValue(otherUserAccount);

      // Act & Assert
      await expect(service.getTotalByAccount(accountId, userId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});


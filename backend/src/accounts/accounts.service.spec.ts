import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock de PrismaService
const mockPrismaService = {
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  cashflow: {
    findMany: jest.fn(),
  },
  accountSnapshot: {
    findFirst: jest.fn(),
  },
};

describe('AccountsService', () => {
  let service: AccountsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('update', () => {
    const accountId = 'account-id';
    const userId = 'user-id';
    const otherUserId = 'other-user-id';

    const mockAccount = {
      id: accountId,
      userId,
      name: 'Test Account',
      broker: 'Test Broker',
      type: 'SPOT',
      currency: 'USD',
      status: AccountStatus.ACTIVE,
      initialBalance: new Decimal(1000),
      currentBalance: new Decimal(1000),
      notes: null,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('debería actualizar cuenta correctamente', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = {
        name: 'Updated Account',
        broker: 'Updated Broker',
      };
      const updatedAccount = { ...mockAccount, ...updateDto };

      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      mockPrismaService.account.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.update(accountId, userId, updateDto);

      // Assert
      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: accountId },
      });
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: updateDto,
      });
      expect(result).toEqual(updatedAccount);
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = { name: 'Updated Account' };
      const otherUserAccount = { ...mockAccount, userId: otherUserId };

      mockPrismaService.account.findUnique.mockResolvedValue(otherUserAccount);

      // Act & Assert
      await expect(service.update(accountId, userId, updateDto)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrismaService.account.update).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si cuenta no existe', async () => {
      // Arrange
      const updateDto: UpdateAccountDto = { name: 'Updated Account' };
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(accountId, userId, updateDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getAccountDetails', () => {
    const accountId = 'account-id';
    const userId = 'user-id';

    const mockAccount = {
      id: accountId,
      userId,
      name: 'Test Account',
      broker: 'Test Broker',
      type: 'SPOT',
      currency: 'USD',
      status: AccountStatus.ACTIVE,
      initialBalance: new Decimal(1000),
      currentBalance: new Decimal(1000),
      notes: null,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('debería calcular balance correctamente', async () => {
      // Arrange
      mockPrismaService.account.findUnique
        .mockResolvedValueOnce(mockAccount) // findOne
        .mockResolvedValueOnce({ initialBalance: new Decimal(1000) }); // calculateBalance
      
      const cashflows = [
        { type: 'DEPOSIT', amount: new Decimal(500) },
        { type: 'WITHDRAWAL', amount: new Decimal(200) },
      ];
      
      mockPrismaService.cashflow.findMany
        .mockResolvedValueOnce(cashflows) // getTotalCashflows
        .mockResolvedValueOnce(cashflows); // calculateBalance
      
      // Mock para calculateMonthlyReturn (llama calculateEquity que llama calculateBalance)
      mockPrismaService.account.findUnique
        .mockResolvedValueOnce({ initialBalance: new Decimal(1000) }); // calculateEquity -> calculateBalance
      mockPrismaService.cashflow.findMany
        .mockResolvedValueOnce(cashflows); // calculateEquity -> calculateBalance
      
      // Mock para calculateDrawdown y calculateMonthlyReturn
      mockPrismaService.accountSnapshot.findFirst
        .mockResolvedValue(null); // Todas las llamadas retornan null

      // Act
      const result = await service.getAccountDetails(accountId, userId);

      // Assert
      // Verificar que se calculan los valores
      expect(result).toHaveProperty('currentBalance');
      expect(result).toHaveProperty('totalCashflows');
      expect(result).toHaveProperty('equity');
      expect(result).toHaveProperty('drawdown');
      expect(result).toHaveProperty('totalRealizedPnL');
      expect(typeof result.currentBalance).toBe('number');
      expect(typeof result.equity).toBe('number');
      expect(mockPrismaService.cashflow.findMany).toHaveBeenCalled();
    });

    it('debería calcular equity correctamente', async () => {
      // Arrange
      mockPrismaService.account.findUnique
        .mockResolvedValueOnce(mockAccount) // findOne
        .mockResolvedValueOnce({ initialBalance: new Decimal(1000) }) // calculateBalance
        .mockResolvedValueOnce({ initialBalance: new Decimal(1000) }); // calculateEquity -> calculateBalance
      
      const cashflows = [
        { type: 'DEPOSIT', amount: new Decimal(500) },
      ];
      
      mockPrismaService.cashflow.findMany
        .mockResolvedValueOnce(cashflows) // getTotalCashflows
        .mockResolvedValueOnce(cashflows) // calculateBalance
        .mockResolvedValueOnce(cashflows); // calculateEquity -> calculateBalance
      
      mockPrismaService.accountSnapshot.findFirst
        .mockResolvedValue(null);

      // Act
      const result = await service.getAccountDetails(accountId, userId);

      // Assert
      // Equity = Balance + RealizedPnL (0 por ahora)
      expect(result.equity).toBeGreaterThanOrEqual(result.currentBalance || 0);
      expect(result.totalRealizedPnL).toBe(0);
      expect(typeof result.equity).toBe('number');
    });
  });

  describe('calculateDrawdown', () => {
    const accountId = 'account-id';

    it('debería calcular drawdown correctamente', async () => {
      // Arrange
      const peakEquity = 2000;
      const currentEquity = 1800;
      const expectedDrawdown = ((peakEquity - currentEquity) / peakEquity) * 100; // 10%

      mockPrismaService.accountSnapshot.findFirst.mockResolvedValue({
        equity: new Decimal(peakEquity),
      });
      mockPrismaService.account.findUnique.mockResolvedValue({
        initialBalance: new Decimal(1000),
      });
      mockPrismaService.cashflow.findMany.mockResolvedValue([]);

      // Act
      const result = await service.calculateDrawdown(accountId, currentEquity);

      // Assert
      expect(result).toBeCloseTo(expectedDrawdown, 2);
    });

    it('debería retornar 0 si no hay snapshots', async () => {
      // Arrange
      mockPrismaService.accountSnapshot.findFirst.mockResolvedValue(null);
      mockPrismaService.account.findUnique.mockResolvedValue({
        initialBalance: new Decimal(1000),
      });
      mockPrismaService.cashflow.findMany.mockResolvedValue([]);

      // Act
      const result = await service.calculateDrawdown(accountId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('calculateMonthlyReturn', () => {
    const accountId = 'account-id';
    const month = 1;
    const year = 2024;

    it('debería calcular rendimiento mensual correctamente', async () => {
      // Arrange
      const startEquity = 1000;
      const endEquity = 1100;
      const expectedReturn = ((endEquity - startEquity) / startEquity) * 100; // 10%

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      mockPrismaService.accountSnapshot.findFirst
        .mockResolvedValueOnce({ equity: new Decimal(startEquity) }) // start
        .mockResolvedValueOnce({ equity: new Decimal(endEquity) }); // end

      // Act
      const result = await service.calculateMonthlyReturn(accountId, month, year);

      // Assert
      expect(result).toBeCloseTo(expectedReturn, 2);
      expect(mockPrismaService.accountSnapshot.findFirst).toHaveBeenCalledTimes(2);
    });

    it('debería retornar 0 si startEquity es 0 o negativo', async () => {
      // Arrange
      mockPrismaService.accountSnapshot.findFirst
        .mockResolvedValueOnce({ equity: new Decimal(0) })
        .mockResolvedValueOnce({ equity: new Decimal(1000) });

      // Act
      const result = await service.calculateMonthlyReturn(accountId, month, year);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('closeAccount', () => {
    const accountId = 'account-id';
    const userId = 'user-id';

    const mockAccount = {
      id: accountId,
      userId,
      name: 'Test Account',
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('debería cerrar cuenta correctamente', async () => {
      // Arrange
      mockPrismaService.account.findUnique.mockResolvedValue(mockAccount);
      const closedAccount = {
        ...mockAccount,
        status: AccountStatus.CLOSED,
        closedAt: new Date(),
      };
      mockPrismaService.account.update.mockResolvedValue(closedAccount);

      // Act
      const result = await service.closeAccount(accountId, userId);

      // Assert
      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          status: AccountStatus.CLOSED,
          closedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe(AccountStatus.CLOSED);
      expect(result.closedAt).toBeDefined();
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      // Arrange
      const otherUserAccount = { ...mockAccount, userId: 'other-user-id' };
      mockPrismaService.account.findUnique.mockResolvedValue(otherUserAccount);

      // Act & Assert
      await expect(service.closeAccount(accountId, userId)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrismaService.account.update).not.toHaveBeenCalled();
    });

    it('debería rechazar si cuenta ya está cerrada', async () => {
      // Arrange
      const closedAccount = { ...mockAccount, status: AccountStatus.CLOSED };
      mockPrismaService.account.findUnique.mockResolvedValue(closedAccount);

      // Act & Assert
      await expect(service.closeAccount(accountId, userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});


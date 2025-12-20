import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDetailResponseDto } from './dto/account-detail-response.dto';
import { AccountStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAccountDto: CreateAccountDto) {
    const { initialBalance, ...rest } = createAccountDto;
    
    return this.prisma.account.create({
      data: {
        userId,
        ...rest,
        initialBalance: initialBalance ? new Decimal(initialBalance) : null,
        // Si se proporciona initialBalance, también establecer currentBalance
        currentBalance: initialBalance ? new Decimal(initialBalance) : null,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    return account;
  }

  async update(id: string, userId: string, updateDto: UpdateAccountDto) {
    // Verificar que la cuenta existe y pertenece al usuario
    const account = await this.findOne(id, userId);

    return this.prisma.account.update({
      where: { id },
      data: updateDto,
    });
  }

  async closeAccount(id: string, userId: string) {
    // Verificar que la cuenta existe y pertenece al usuario
    const account = await this.findOne(id, userId);

    // TODO: Cuando exista el modelo Trade, validar que no haya trades abiertos
    // Por ahora, solo verificamos que la cuenta esté activa
    if (account.status === AccountStatus.CLOSED) {
      throw new BadRequestException('Account is already closed');
    }

    // Soft delete: cambiar status a CLOSED en lugar de eliminar
    // Esto preserva el historial de cashflows y snapshots
    return this.prisma.account.update({
      where: { id },
      data: {
        status: AccountStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  async getAccountDetails(id: string, userId: string): Promise<AccountDetailResponseDto> {
    // Verificar que la cuenta existe y pertenece al usuario
    const account = await this.findOne(id, userId);

    // Calcular métricas
    const currentBalance = await this.calculateBalance(account.id);
    const totalCashflows = await this.getTotalCashflows(account.id);
    const totalRealizedPnL = await this.getTotalRealizedPnL(account.id); // Por ahora 0, hasta que haya trades
    const equity = currentBalance + totalRealizedPnL;
    const drawdown = await this.calculateDrawdown(account.id, equity);

    // Calcular rendimiento mensual (mes actual)
    const now = new Date();
    const monthlyReturn = await this.calculateMonthlyReturn(
      account.id,
      now.getMonth() + 1,
      now.getFullYear(),
    );

    // Convertir Decimal a number para la respuesta
    return {
      ...account,
      initialBalance: account.initialBalance ? Number(account.initialBalance) : null,
      currentBalance: account.currentBalance ? Number(account.currentBalance) : null,
      equity,
      drawdown,
      monthlyReturn,
      totalCashflows,
      totalRealizedPnL,
    };
  }

  async calculateBalance(accountId: string): Promise<number> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { initialBalance: true },
    });

    if (!account) {
      return 0;
    }

    const initialBalance = account.initialBalance ? Number(account.initialBalance) : 0;

    // Sumar todos los cashflows
    const cashflows = await this.prisma.cashflow.findMany({
      where: { accountId },
      select: { type: true, amount: true },
    });

    const cashflowTotal = cashflows.reduce((sum, cf) => {
      const amount = Number(cf.amount);
      // DEPOSIT y ADJUSTMENT positivo, WITHDRAWAL y FEE negativo
      if (cf.type === 'DEPOSIT' || cf.type === 'ADJUSTMENT') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, 0);

    return initialBalance + cashflowTotal;
  }

  /**
   * Calcula el equity de una cuenta
   * Equity = Balance + RealizedPnL + UnrealizedPnL
   * @param accountId ID de la cuenta
   * @param date Fecha opcional para calcular equity histórico
   * @returns Equity calculado
   */
  async calculateEquity(accountId: string, date?: Date): Promise<number> {
    const balance = await this.calculateBalance(accountId);
    const realizedPnL = await this.getTotalRealizedPnL(accountId, date);
    const unrealizedPnL = await this.getTotalUnrealizedPnL(accountId, date);
    return balance + realizedPnL + unrealizedPnL;
  }

  /**
   * Calcula el drawdown actual de una cuenta
   * Drawdown = (Peak Equity - Current Equity) / Peak Equity * 100
   * @param accountId ID de la cuenta
   * @param currentEquity Equity actual (opcional, se calcula si no se proporciona)
   * @returns Drawdown en porcentaje
   */
  async calculateDrawdown(accountId: string, currentEquity?: number): Promise<number> {
    // Obtener el peak equity desde snapshots (el máximo histórico)
    const peakSnapshot = await this.prisma.accountSnapshot.findFirst({
      where: { accountId },
      orderBy: { equity: 'desc' },
      select: { equity: true },
    });

    // Si no hay snapshots, calcular equity actual y usarlo como peak
    const equity = currentEquity ?? (await this.calculateEquity(accountId));

    if (!peakSnapshot) {
      // Si no hay snapshots, el equity actual es el peak (sin drawdown)
      return 0;
    }

    const peakEquity = Number(peakSnapshot.equity);
    if (peakEquity <= 0) {
      return 0;
    }

    // Si el equity actual es mayor que el peak, actualizar el peak
    const actualPeak = Math.max(peakEquity, equity);
    if (actualPeak <= 0) {
      return 0;
    }

    const drawdown = ((actualPeak - equity) / actualPeak) * 100;
    return Math.max(0, drawdown); // No puede ser negativo
  }

  /**
   * Obtiene el máximo drawdown histórico de una cuenta
   * @param accountId ID de la cuenta
   * @returns Máximo drawdown histórico en porcentaje
   */
  async getMaxDrawdown(accountId: string): Promise<number> {
    const maxDrawdownSnapshot = await this.prisma.accountSnapshot.findFirst({
      where: { accountId },
      orderBy: { drawdown: 'desc' },
      select: { drawdown: true },
    });

    if (!maxDrawdownSnapshot) {
      // Si no hay snapshots, calcular drawdown actual
      return await this.calculateDrawdown(accountId);
    }

    return Number(maxDrawdownSnapshot.drawdown);
  }

  async calculateMonthlyReturn(
    accountId: string,
    month: number,
    year: number,
  ): Promise<number> {
    // Obtener equity al inicio del mes
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const startSnapshot = await this.prisma.accountSnapshot.findFirst({
      where: {
        accountId,
        date: { lte: startOfMonth },
      },
      orderBy: { date: 'desc' },
      select: { equity: true },
    });

    const endSnapshot = await this.prisma.accountSnapshot.findFirst({
      where: {
        accountId,
        date: { lte: endOfMonth },
      },
      orderBy: { date: 'desc' },
      select: { equity: true },
    });

    // Si no hay snapshots, calcular desde equity actual
    const startEquity = startSnapshot
      ? Number(startSnapshot.equity)
      : await this.calculateEquity(accountId, startOfMonth);
    const endEquity = endSnapshot
      ? Number(endSnapshot.equity)
      : await this.calculateEquity(accountId, endOfMonth);

    if (startEquity <= 0) {
      return 0;
    }

    return ((endEquity - startEquity) / startEquity) * 100;
  }

  async getTotalCashflows(accountId: string): Promise<number> {
    const cashflows = await this.prisma.cashflow.findMany({
      where: { accountId },
      select: { type: true, amount: true },
    });

    return cashflows.reduce((sum, cf) => {
      const amount = Number(cf.amount);
      if (cf.type === 'DEPOSIT' || cf.type === 'ADJUSTMENT') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, 0);
  }

  async getTotalRealizedPnL(accountId: string, date?: Date): Promise<number> {
    // TODO: Implementar cuando exista el modelo Trade
    // Por ahora retornar 0
    // La lógica será: sum(NetPnL de trades cerrados en esta cuenta hasta la fecha)
    return 0;
  }

  /**
   * Obtiene el PnL no realizado de trades abiertos (opcional en MVP)
   * @param accountId ID de la cuenta
   * @param date Fecha opcional para calcular PnL histórico
   * @returns PnL no realizado
   */
  async getTotalUnrealizedPnL(accountId: string, date?: Date): Promise<number> {
    // TODO: Implementar cuando exista el modelo Trade
    // Por ahora retornar 0
    // La lógica será: sum(PnL no realizado de trades abiertos en esta cuenta hasta la fecha)
    return 0;
  }
}


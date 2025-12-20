import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(
    private prisma: PrismaService,
    private accountsService: AccountsService,
  ) {}

  /**
   * Genera un snapshot para una cuenta en una fecha específica
   * @param accountId ID de la cuenta
   * @param date Fecha del snapshot (default: hoy)
   * @returns Snapshot creado o actualizado
   */
  async createSnapshot(accountId: string, date: Date = new Date()): Promise<void> {
    // Normalizar la fecha al inicio del día
    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    // Calcular métricas
    const balance = await this.accountsService.calculateBalance(accountId);
    const realizedPnL = await this.accountsService.getTotalRealizedPnL(accountId, snapshotDate);
    const unrealizedPnL = await this.accountsService.getTotalUnrealizedPnL(
      accountId,
      snapshotDate,
    );
    const equity = balance + realizedPnL + unrealizedPnL;

    // Calcular drawdown
    const drawdown = await this.accountsService.calculateDrawdown(accountId, equity);

    // Crear o actualizar snapshot (usando upsert por el constraint único)
    await this.prisma.accountSnapshot.upsert({
      where: {
        accountId_date: {
          accountId,
          date: snapshotDate,
        },
      },
      create: {
        accountId,
        date: snapshotDate,
        equity: new Decimal(equity),
        balance: new Decimal(balance),
        realizedPnL: new Decimal(realizedPnL),
        unrealizedPnL: unrealizedPnL !== 0 ? new Decimal(unrealizedPnL) : null,
        drawdown: new Decimal(drawdown),
      },
      update: {
        equity: new Decimal(equity),
        balance: new Decimal(balance),
        realizedPnL: new Decimal(realizedPnL),
        unrealizedPnL: unrealizedPnL !== 0 ? new Decimal(unrealizedPnL) : null,
        drawdown: new Decimal(drawdown),
      },
    });

    this.logger.log(`Snapshot created/updated for account ${accountId} on ${snapshotDate.toISOString()}`);
  }

  /**
   * Genera snapshots para todas las cuentas activas
   * @param date Fecha del snapshot (default: hoy)
   */
  async createSnapshotsForAllAccounts(date: Date = new Date()): Promise<void> {
    const accounts = await this.prisma.account.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    this.logger.log(`Generating snapshots for ${accounts.length} accounts`);

    for (const account of accounts) {
      try {
        await this.createSnapshot(account.id, date);
      } catch (error) {
        this.logger.error(
          `Error creating snapshot for account ${account.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Snapshots generation completed`);
  }

  /**
   * Regenera snapshots históricos para una cuenta
   * @param accountId ID de la cuenta
   * @param startDate Fecha de inicio (opcional)
   * @param endDate Fecha de fin (opcional, default: hoy)
   */
  async regenerateHistoricalSnapshots(
    accountId: string,
    startDate?: Date,
    endDate: Date = new Date(),
  ): Promise<number> {
    // Verificar que la cuenta existe
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, createdAt: true },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Si no se proporciona startDate, usar la fecha de creación de la cuenta
    const start = startDate || account.createdAt;
    const current = new Date(start);
    let count = 0;

    this.logger.log(
      `Regenerating snapshots for account ${accountId} from ${start.toISOString()} to ${endDate.toISOString()}`,
    );

    // Generar snapshot para cada día
    while (current <= endDate) {
      try {
        await this.createSnapshot(accountId, new Date(current));
        count++;
      } catch (error) {
        this.logger.error(
          `Error creating snapshot for account ${accountId} on ${current.toISOString()}: ${error.message}`,
        );
      }

      // Avanzar al siguiente día
      current.setDate(current.getDate() + 1);
    }

    this.logger.log(`Regenerated ${count} snapshots for account ${accountId}`);
    return count;
  }

  /**
   * Regenera snapshots históricos para todas las cuentas activas
   * @param startDate Fecha de inicio (opcional)
   * @param endDate Fecha de fin (opcional, default: hoy)
   */
  async regenerateAllHistoricalSnapshots(
    startDate?: Date,
    endDate: Date = new Date(),
  ): Promise<number> {
    const accounts = await this.prisma.account.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: { id: true, createdAt: true },
    });

    let totalCount = 0;

    for (const account of accounts) {
      const start = startDate || account.createdAt;
      const count = await this.regenerateHistoricalSnapshots(account.id, start, endDate);
      totalCount += count;
    }

    this.logger.log(`Regenerated ${totalCount} total snapshots for all accounts`);
    return totalCount;
  }
}


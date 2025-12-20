import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { TradeListQueryDto, TradeStatus } from './dto/trade-list-query.dto';
import { CloseTradeDto } from './dto/close-trade.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TradesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo trade planificado.
   */
  async create(userId: string, createDto: CreateTradeDto) {
    // Validar accountId pertenece al usuario
    const account = await this.prisma.account.findUnique({
      where: { id: createDto.accountId },
    });
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    // Validar instrumentId existe
    const instrument = await this.prisma.instrument.findUnique({
      where: { id: createDto.instrumentId },
    });
    if (!instrument || instrument.userId !== userId) {
      throw new NotFoundException('Instrumento no encontrado');
    }

    // Validar strategyId si se proporciona
    if (createDto.strategyId) {
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: createDto.strategyId },
      });
      if (!strategy || strategy.userId !== userId) {
        throw new NotFoundException('Estrategia no encontrada');
      }
    }

    // Validar setupId si se proporciona
    if (createDto.setupId) {
      const setup = await this.prisma.setup.findUnique({
        where: { id: createDto.setupId },
      });
      if (!setup || setup.userId !== userId) {
        throw new NotFoundException('Setup no encontrado');
      }
      // Validar que setup pertenezca a la estrategia si ambas se proporcionan
      if (createDto.strategyId && setup.strategyId !== createDto.strategyId) {
        throw new BadRequestException('El setup no pertenece a la estrategia especificada');
      }
    }

    // Validar que al menos uno de riskPercent o riskAmount esté presente
    if (!createDto.riskPercent && !createDto.riskAmount) {
      throw new BadRequestException('Debe especificar riskPercent o riskAmount');
    }

    // Calcular plannedSize si se proporciona riskPercent o riskAmount
    let plannedSize: Decimal | null = createDto.plannedSize ? new Decimal(createDto.plannedSize) : null;
    if (!plannedSize && createDto.plannedStopLoss) {
      if (createDto.riskPercent) {
        // Calcular tamaño basado en % de riesgo
        const accountBalance = account.currentBalance || account.initialBalance || new Decimal(0);
        const riskAmount = accountBalance.mul(createDto.riskPercent).div(100);
        const riskPerUnit = new Decimal(createDto.plannedStopLoss).abs();
        plannedSize = riskAmount.div(riskPerUnit);
      } else if (createDto.riskAmount) {
        // Calcular tamaño basado en monto fijo
        const riskPerUnit = new Decimal(createDto.plannedStopLoss).abs();
        plannedSize = new Decimal(createDto.riskAmount).div(riskPerUnit);
      }
    }

    const trade = await this.prisma.trade.create({
      data: {
        userId,
        accountId: createDto.accountId,
        instrumentId: createDto.instrumentId,
        strategyId: createDto.strategyId || null,
        setupId: createDto.setupId || null,
        side: createDto.side,
        type: createDto.type || 'SPOT',
        status: 'PLANNED',
        timeframe: createDto.timeframe?.trim() || null,
        plannedEntry: createDto.plannedEntry ? new Decimal(createDto.plannedEntry) : null,
        plannedStopLoss: createDto.plannedStopLoss ? new Decimal(createDto.plannedStopLoss) : null,
        plannedTakeProfits: createDto.plannedTakeProfits?.map((tp) => new Decimal(tp)) || [],
        riskPercent: createDto.riskPercent ? new Decimal(createDto.riskPercent) : null,
        riskAmount: createDto.riskAmount ? new Decimal(createDto.riskAmount) : null,
        plannedSize: plannedSize || null,
        tags: createDto.tags || [],
        thesis: createDto.thesis?.trim() || null,
        screenshotUrl: createDto.screenshotUrl?.trim() || null,
        totalFees: new Decimal(0),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return await this.calculateMetrics(trade);
  }

  /**
   * Lista trades con filtros y paginación.
   */
  async findAll(userId: string, query: TradeListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    // Filtros
    if (query.accountId) where.accountId = query.accountId;
    if (query.instrumentId) where.instrumentId = query.instrumentId;
    if (query.strategyId) where.strategyId = query.strategyId;
    if (query.setupId) where.setupId = query.setupId;
    if (query.status) where.status = query.status;
    if (query.side) where.side = query.side;
    if (query.result) where.result = query.result;

    if (query.tags && query.tags.length > 0) {
      where.tags = {
        hasEvery: query.tags,
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.OR = [];
      if (query.dateFrom) {
        where.OR.push({ openTime: { gte: new Date(query.dateFrom) } });
        where.OR.push({ closeTime: { gte: new Date(query.dateFrom) } });
      }
      if (query.dateTo) {
        where.OR.push({ openTime: { lte: new Date(query.dateTo) } });
        where.OR.push({ closeTime: { lte: new Date(query.dateTo) } });
      }
    }

    // Búsqueda
    if (query.search) {
      where.OR = [
        ...(where.OR || []),
        { thesis: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    // Contar total
    const total = await this.prisma.trade.count({ where });

    // Obtener trades
    const trades = await this.prisma.trade.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { openTime: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            fills: true,
          },
        },
      },
    });

    // Calcular métricas para cada trade
    const tradesWithMetrics = await Promise.all(
      trades.map((trade) => this.calculateMetrics(trade)),
    );

    return {
      data: tradesWithMetrics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un trade por ID con todas sus relaciones y métricas.
   */
  async findOne(id: string, userId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
        fills: {
          orderBy: {
            datetime: 'asc',
          },
        },
        checklist: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                description: true,
                order: true,
                isRequired: true,
              },
            },
          },
          orderBy: {
            rule: {
              order: 'asc',
            },
          },
        },
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    return await this.calculateMetrics(trade);
  }

  /**
   * Actualiza un trade.
   */
  async update(id: string, userId: string, updateDto: UpdateTradeDto) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    // No se puede editar si está CLOSED
    if (trade.status === 'CLOSED') {
      throw new BadRequestException('No se puede editar un trade cerrado');
    }

    // Validar strategyId y setupId si se proporcionan
    if (updateDto.strategyId) {
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: updateDto.strategyId },
      });
      if (!strategy || strategy.userId !== userId) {
        throw new NotFoundException('Estrategia no encontrada');
      }
    }

    if (updateDto.setupId) {
      const setup = await this.prisma.setup.findUnique({
        where: { id: updateDto.setupId },
      });
      if (!setup || setup.userId !== userId) {
        throw new NotFoundException('Setup no encontrado');
      }
    }

    const updatedTrade = await this.prisma.trade.update({
      where: { id },
      data: {
        ...(updateDto.side && { side: updateDto.side }),
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.timeframe !== undefined && { timeframe: updateDto.timeframe?.trim() || null }),
        ...(updateDto.strategyId !== undefined && { strategyId: updateDto.strategyId || null }),
        ...(updateDto.setupId !== undefined && { setupId: updateDto.setupId || null }),
        ...(updateDto.plannedEntry !== undefined && {
          plannedEntry: updateDto.plannedEntry ? new Decimal(updateDto.plannedEntry) : null,
        }),
        ...(updateDto.plannedStopLoss !== undefined && {
          plannedStopLoss: updateDto.plannedStopLoss ? new Decimal(updateDto.plannedStopLoss) : null,
        }),
        ...(updateDto.plannedTakeProfits !== undefined && {
          plannedTakeProfits: updateDto.plannedTakeProfits?.map((tp) => new Decimal(tp)) || [],
        }),
        ...(updateDto.riskPercent !== undefined && {
          riskPercent: updateDto.riskPercent ? new Decimal(updateDto.riskPercent) : null,
        }),
        ...(updateDto.riskAmount !== undefined && {
          riskAmount: updateDto.riskAmount ? new Decimal(updateDto.riskAmount) : null,
        }),
        ...(updateDto.plannedSize !== undefined && {
          plannedSize: updateDto.plannedSize ? new Decimal(updateDto.plannedSize) : null,
        }),
        ...(updateDto.tags !== undefined && { tags: updateDto.tags }),
        ...(updateDto.thesis !== undefined && { thesis: updateDto.thesis?.trim() || null }),
        ...(updateDto.screenshotUrl !== undefined && {
          screenshotUrl: updateDto.screenshotUrl?.trim() || null,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes?.trim() || null }),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.calculateMetrics(updatedTrade);
  }

  /**
   * Abre un trade (PLANNED → OPEN).
   */
  async openTrade(id: string, userId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    if (trade.status !== 'PLANNED') {
      throw new BadRequestException('Solo se pueden abrir trades en estado PLANNED');
    }

    const updatedTrade = await this.prisma.trade.update({
      where: { id },
      data: {
        status: 'OPEN',
        openTime: new Date(),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.calculateMetrics(updatedTrade);
  }

  /**
   * Cierra un trade (OPEN → CLOSED).
   */
  async closeTrade(id: string, userId: string, closeDto: CloseTradeDto) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
      include: {
        fills: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    if (trade.status !== 'OPEN') {
      throw new BadRequestException('Solo se pueden cerrar trades en estado OPEN');
    }

    // Calcular openQuantity
    const metrics = await this.calculateMetrics(trade);
    if (metrics.openQuantity && metrics.openQuantity > 0) {
      throw new BadRequestException(
        `No se puede cerrar el trade. Cantidad abierta: ${metrics.openQuantity}`,
      );
    }

    // Calcular métricas finales
    const realizedPnL = new Decimal(metrics.realizedPnL || 0);
    const totalFees = trade.totalFees;
    const netPnL = realizedPnL.minus(totalFees);

    let rMultiple: Decimal | null = null;
    if (trade.riskAmount) {
      rMultiple = netPnL.div(trade.riskAmount);
    }

    // Actualizar trade
    const updatedTrade = await this.prisma.trade.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closeTime: new Date(),
        realizedPnL,
        netPnL,
        rMultiple,
        result: closeDto.result,
        emotion: closeDto.emotion || null,
        lessonLearned: closeDto.lessonLearned?.trim() || null,
        checklistCompleted: closeDto.checklist
          ? closeDto.checklist.every((item) => item.completed)
          : false,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Actualizar checklist si se proporciona
    if (closeDto.checklist && closeDto.checklist.length > 0) {
      await Promise.all(
        closeDto.checklist.map((item) =>
          this.prisma.tradeChecklist.upsert({
            where: {
              tradeId_ruleId: {
                tradeId: id,
                ruleId: item.ruleId,
              },
            },
            create: {
              tradeId: id,
              ruleId: item.ruleId,
              userId,
              completed: item.completed,
              notes: item.notes?.trim() || null,
            },
            update: {
              completed: item.completed,
              notes: item.notes?.trim() || null,
            },
          }),
        ),
      );
    }

    return this.calculateMetrics(updatedTrade);
  }

  /**
   * Cancela un trade (PLANNED → CANCELED).
   */
  async cancelTrade(id: string, userId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    if (trade.status !== 'PLANNED') {
      throw new BadRequestException('Solo se pueden cancelar trades en estado PLANNED');
    }

    const updatedTrade = await this.prisma.trade.update({
      where: { id },
      data: {
        status: 'CANCELED',
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.calculateMetrics(updatedTrade);
  }

  /**
   * Duplica un trade.
   */
  async duplicateTrade(id: string, userId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    const duplicatedTrade = await this.prisma.trade.create({
      data: {
        userId,
        accountId: trade.accountId,
        instrumentId: trade.instrumentId,
        strategyId: trade.strategyId,
        setupId: trade.setupId,
        side: trade.side,
        type: trade.type,
        status: 'PLANNED',
        timeframe: trade.timeframe,
        plannedEntry: trade.plannedEntry,
        plannedStopLoss: trade.plannedStopLoss,
        plannedTakeProfits: trade.plannedTakeProfits,
        riskPercent: trade.riskPercent,
        riskAmount: trade.riskAmount,
        plannedSize: trade.plannedSize,
        tags: trade.tags,
        thesis: trade.thesis,
        screenshotUrl: trade.screenshotUrl,
        totalFees: new Decimal(0),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.calculateMetrics(duplicatedTrade);
  }

  /**
   * Calcula las métricas de un trade basándose en sus fills.
   */
  async calculateMetrics(trade: any) {
    // Obtener fills si no están incluidos
    let fills = trade.fills || [];
    if (!fills || fills.length === 0) {
      fills = await this.prisma.fill.findMany({
        where: { tradeId: trade.id },
        orderBy: { datetime: 'asc' },
      });
    }

    const entryFills = fills.filter((f: any) => f.type === 'ENTRY');
    const exitFills = fills.filter((f: any) => f.type === 'EXIT');

    // Calcular openQuantity
    let openQuantity = new Decimal(0);
    entryFills.forEach((fill: any) => {
      if (fill.quantity) {
        openQuantity = openQuantity.plus(fill.quantity);
      }
    });
    exitFills.forEach((fill: any) => {
      if (fill.quantity) {
        openQuantity = openQuantity.minus(fill.quantity);
      }
    });

    // Calcular avgEntryPrice
    let avgEntryPrice: Decimal | null = null;
    if (entryFills.length > 0) {
      let totalQuantity = new Decimal(0);
      let totalValue = new Decimal(0);
      entryFills.forEach((fill: any) => {
        if (fill.quantity && fill.price) {
          totalQuantity = totalQuantity.plus(fill.quantity);
          totalValue = totalValue.plus(fill.quantity.mul(fill.price));
        }
      });
      if (totalQuantity.gt(0)) {
        avgEntryPrice = totalValue.div(totalQuantity);
      }
    }

    // Calcular avgExitPrice
    let avgExitPrice: Decimal | null = null;
    if (exitFills.length > 0) {
      let totalQuantity = new Decimal(0);
      let totalValue = new Decimal(0);
      exitFills.forEach((fill: any) => {
        if (fill.quantity && fill.price) {
          totalQuantity = totalQuantity.plus(fill.quantity);
          totalValue = totalValue.plus(fill.quantity.mul(fill.price));
        }
      });
      if (totalQuantity.gt(0)) {
        avgExitPrice = totalValue.div(totalQuantity);
      }
    }

    // Calcular breakEvenPrice
    let breakEvenPrice: Decimal | null = null;
    if (avgEntryPrice && openQuantity.gt(0)) {
      const totalFees = trade.totalFees || new Decimal(0);
      breakEvenPrice = avgEntryPrice.plus(totalFees.div(openQuantity));
    }

    // Calcular realizedPnL
    let realizedPnL = new Decimal(0);
    exitFills.forEach((fill: any) => {
      if (fill.quantity && fill.price && avgEntryPrice) {
        const pnl = fill.quantity.mul(fill.price.minus(avgEntryPrice));
        realizedPnL = realizedPnL.plus(pnl);
      }
    });

    // Convertir Decimal a number para la respuesta
    return {
      ...trade,
      openQuantity: openQuantity.toNumber(),
      avgEntryPrice: avgEntryPrice?.toNumber() || null,
      avgExitPrice: avgExitPrice?.toNumber() || null,
      breakEvenPrice: breakEvenPrice?.toNumber() || null,
      realizedPnL: realizedPnL.toNumber(),
      netPnL: trade.netPnL ? trade.netPnL.toNumber() : null,
      rMultiple: trade.rMultiple ? trade.rMultiple.toNumber() : null,
      totalFees: trade.totalFees.toNumber(),
      plannedEntry: trade.plannedEntry?.toNumber() || null,
      plannedStopLoss: trade.plannedStopLoss?.toNumber() || null,
      plannedTakeProfits: trade.plannedTakeProfits?.map((tp: Decimal) => tp.toNumber()) || [],
      riskPercent: trade.riskPercent?.toNumber() || null,
      riskAmount: trade.riskAmount?.toNumber() || null,
      plannedSize: trade.plannedSize?.toNumber() || null,
    };
  }
}


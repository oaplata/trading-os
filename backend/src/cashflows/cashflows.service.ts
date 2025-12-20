import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { CashflowListQueryDto } from './dto/cashflow-list-query.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class CashflowsService {
  constructor(
    private prisma: PrismaService,
    private accountsService: AccountsService,
  ) {}

  async create(userId: string, createDto: CreateCashflowDto) {
    // Validar que la cuenta existe y pertenece al usuario
    const account = await this.prisma.account.findUnique({
      where: { id: createDto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    // Validar que la moneda coincide
    if (account.currency !== createDto.currency) {
      throw new BadRequestException(
        `Currency mismatch. Account currency is ${account.currency}`,
      );
    }

    // Validar que la fecha no sea futura
    const cashflowDate = createDto.date ? new Date(createDto.date) : new Date();
    const now = new Date();
    if (cashflowDate > now) {
      throw new BadRequestException('Cashflow date cannot be in the future');
    }

    // Crear cashflow
    const cashflow = await this.prisma.cashflow.create({
      data: {
        accountId: createDto.accountId,
        userId,
        type: createDto.type,
        amount: new Decimal(createDto.amount),
        currency: createDto.currency,
        description: createDto.description,
        date: createDto.date ? new Date(createDto.date) : new Date(),
        category: createDto.category,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Actualizar balance de la cuenta
    const newBalance = await this.accountsService.calculateBalance(account.id);
    await this.prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: new Decimal(newBalance) },
    });

    return {
      ...cashflow,
      amount: Number(cashflow.amount),
    };
  }

  async findAll(userId: string, query: CashflowListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      userId,
    };

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    // Obtener total para paginación
    const total = await this.prisma.cashflow.count({ where });

    // Obtener cashflows
    const cashflows = await this.prisma.cashflow.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: cashflows.map((cf) => ({
        ...cf,
        amount: Number(cf.amount),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const cashflow = await this.prisma.cashflow.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!cashflow) {
      throw new NotFoundException('Cashflow not found');
    }

    if (cashflow.userId !== userId) {
      throw new ForbiddenException('You do not have access to this cashflow');
    }

    return {
      ...cashflow,
      amount: Number(cashflow.amount),
    };
  }

  async update(id: string, userId: string, updateDto: UpdateCashflowDto) {
    // Verificar que el cashflow existe y pertenece al usuario
    const cashflow = await this.findOne(id, userId);

    // Si se actualiza la moneda, validar que coincide con la cuenta
    if (updateDto.currency) {
      const account = await this.prisma.account.findUnique({
        where: { id: cashflow.accountId },
        select: { currency: true },
      });

      if (account && account.currency !== updateDto.currency) {
        throw new BadRequestException(
          `Currency mismatch. Account currency is ${account.currency}`,
        );
      }
    }

    // Si se actualiza la fecha, validar que no sea futura
    if (updateDto.date) {
      const cashflowDate = new Date(updateDto.date);
      const now = new Date();
      if (cashflowDate > now) {
        throw new BadRequestException('Cashflow date cannot be in the future');
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (updateDto.type !== undefined) updateData.type = updateDto.type;
    if (updateDto.amount !== undefined) updateData.amount = new Decimal(updateDto.amount);
    if (updateDto.currency !== undefined) updateData.currency = updateDto.currency;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.date !== undefined) updateData.date = new Date(updateDto.date);
    if (updateDto.category !== undefined) updateData.category = updateDto.category;

    const updated = await this.prisma.cashflow.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Actualizar balance de la cuenta
    const newBalance = await this.accountsService.calculateBalance(cashflow.accountId);
    await this.prisma.account.update({
      where: { id: cashflow.accountId },
      data: { currentBalance: new Decimal(newBalance) },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async delete(id: string, userId: string) {
    // Verificar que el cashflow existe y pertenece al usuario
    const cashflow = await this.findOne(id, userId);

    // Eliminar cashflow
    await this.prisma.cashflow.delete({
      where: { id },
    });

    // Actualizar balance de la cuenta
    const newBalance = await this.accountsService.calculateBalance(cashflow.accountId);
    await this.prisma.account.update({
      where: { id: cashflow.accountId },
      data: { currentBalance: new Decimal(newBalance) },
    });

    return { message: 'Cashflow deleted successfully' };
  }

  async getTotalByAccount(accountId: string, userId: string) {
    // Verificar que la cuenta existe y pertenece al usuario
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    return this.accountsService.getTotalCashflows(accountId);
  }

  async getTimeline(
    userId: string,
    accountId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { userId };

    if (accountId) {
      where.accountId = accountId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const cashflows = await this.prisma.cashflow.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return cashflows.map((cf) => ({
      ...cf,
      amount: Number(cf.amount),
    }));
  }
}


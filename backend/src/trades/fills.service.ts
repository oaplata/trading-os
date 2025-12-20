import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFillDto } from './dto/create-fill.dto';
import { UpdateFillDto } from './dto/update-fill.dto';
import { FillType } from './dto/create-fill.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FillsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo fill.
   */
  async create(userId: string, createDto: CreateFillDto) {
    // Validar trade pertenece al usuario
    const trade = await this.prisma.trade.findUnique({
      where: { id: createDto.tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    // Validar trade está OPEN para ENTRY/EXIT
    if (
      (createDto.type === FillType.ENTRY || createDto.type === FillType.EXIT) &&
      trade.status !== 'OPEN'
    ) {
      throw new BadRequestException('Solo se pueden agregar fills ENTRY/EXIT a trades OPEN');
    }

    // Validar quantity y price para ENTRY/EXIT
    if (
      (createDto.type === FillType.ENTRY || createDto.type === FillType.EXIT) &&
      (!createDto.quantity || !createDto.price)
    ) {
      throw new BadRequestException('Quantity y price son requeridos para fills ENTRY/EXIT');
    }

    // Crear fill
    const fill = await this.prisma.fill.create({
      data: {
        tradeId: createDto.tradeId,
        userId,
        type: createDto.type,
        quantity: createDto.quantity ? new Decimal(createDto.quantity) : null,
        price: createDto.price ? new Decimal(createDto.price) : null,
        fee: createDto.fee ? new Decimal(createDto.fee) : new Decimal(0),
        feeCurrency: createDto.feeCurrency || 'USD',
        datetime: new Date(createDto.datetime),
        notes: createDto.notes?.trim() || null,
      },
    });

    // Actualizar totalFees del trade
    const updatedTrade = await this.prisma.trade.findUnique({
      where: { id: createDto.tradeId },
      include: { fills: true },
    });

    if (updatedTrade) {
      const totalFees = updatedTrade.fills.reduce(
        (sum, f) => sum.plus(f.fee),
        new Decimal(0),
      );

      await this.prisma.trade.update({
        where: { id: createDto.tradeId },
        data: { totalFees },
      });
    }

    return {
      ...fill,
      quantity: fill.quantity?.toNumber() || null,
      price: fill.price?.toNumber() || null,
      fee: fill.fee.toNumber(),
    };
  }

  /**
   * Lista fills de un trade.
   */
  async findAllByTrade(tradeId: string, userId: string) {
    // Validar trade pertenece al usuario
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade no encontrado');
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este trade');
    }

    const fills = await this.prisma.fill.findMany({
      where: { tradeId },
      orderBy: { datetime: 'asc' },
    });

    return fills.map((fill) => ({
      ...fill,
      quantity: fill.quantity?.toNumber() || null,
      price: fill.price?.toNumber() || null,
      fee: fill.fee.toNumber(),
    }));
  }

  /**
   * Obtiene un fill por ID.
   */
  async findOne(id: string, userId: string) {
    const fill = await this.prisma.fill.findUnique({
      where: { id },
    });

    if (!fill) {
      throw new NotFoundException('Fill no encontrado');
    }

    if (fill.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este fill');
    }

    return {
      ...fill,
      quantity: fill.quantity?.toNumber() || null,
      price: fill.price?.toNumber() || null,
      fee: fill.fee.toNumber(),
    };
  }

  /**
   * Actualiza un fill.
   */
  async update(id: string, userId: string, updateDto: UpdateFillDto) {
    const fill = await this.prisma.fill.findUnique({
      where: { id },
    });

    if (!fill) {
      throw new NotFoundException('Fill no encontrado');
    }

    if (fill.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este fill');
    }

    // Validar quantity y price si se cambia el tipo a ENTRY/EXIT
    const newType = updateDto.type || fill.type;
    if (
      (newType === FillType.ENTRY || newType === FillType.EXIT) &&
      (!updateDto.quantity || !updateDto.price)
    ) {
      const currentQuantity = updateDto.quantity !== undefined ? updateDto.quantity : fill.quantity?.toNumber();
      const currentPrice = updateDto.price !== undefined ? updateDto.price : fill.price?.toNumber();
      if (!currentQuantity || !currentPrice) {
        throw new BadRequestException('Quantity y price son requeridos para fills ENTRY/EXIT');
      }
    }

    const updatedFill = await this.prisma.fill.update({
      where: { id },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity ? new Decimal(updateDto.quantity) : null,
        }),
        ...(updateDto.price !== undefined && {
          price: updateDto.price ? new Decimal(updateDto.price) : null,
        }),
        ...(updateDto.fee !== undefined && { fee: new Decimal(updateDto.fee) }),
        ...(updateDto.feeCurrency !== undefined && { feeCurrency: updateDto.feeCurrency }),
        ...(updateDto.datetime && { datetime: new Date(updateDto.datetime) }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes?.trim() || null }),
      },
    });

    // Actualizar totalFees del trade
    const trade = await this.prisma.trade.findUnique({
      where: { id: fill.tradeId },
      include: { fills: true },
    });

    if (trade) {
      const totalFees = trade.fills.reduce(
        (sum, f) => sum.plus(f.fee),
        new Decimal(0),
      );

      await this.prisma.trade.update({
        where: { id: fill.tradeId },
        data: { totalFees },
      });
    }

    return {
      ...updatedFill,
      quantity: updatedFill.quantity?.toNumber() || null,
      price: updatedFill.price?.toNumber() || null,
      fee: updatedFill.fee.toNumber(),
    };
  }

  /**
   * Elimina un fill.
   */
  async delete(id: string, userId: string) {
    const fill = await this.prisma.fill.findUnique({
      where: { id },
    });

    if (!fill) {
      throw new NotFoundException('Fill no encontrado');
    }

    if (fill.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este fill');
    }

    await this.prisma.fill.delete({
      where: { id },
    });

    // Actualizar totalFees del trade
    const trade = await this.prisma.trade.findUnique({
      where: { id: fill.tradeId },
      include: { fills: true },
    });

    if (trade) {
      const totalFees = trade.fills.reduce(
        (sum, f) => sum.plus(f.fee),
        new Decimal(0),
      );

      await this.prisma.trade.update({
        where: { id: fill.tradeId },
        data: { totalFees },
      });
    }
  }
}


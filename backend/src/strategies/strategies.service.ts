import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { StrategyListQueryDto } from './dto/strategy-list-query.dto';

@Injectable()
export class StrategiesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva estrategia.
   * @param userId ID del usuario propietario
   * @param createDto Datos para crear la estrategia
   * @returns La estrategia creada
   */
  async create(userId: string, createDto: CreateStrategyDto) {
    const strategy = await this.prisma.strategy.create({
      data: {
        userId,
        name: createDto.name.trim(),
        description: createDto.description?.trim() || null,
        targetMarket: createDto.targetMarket?.trim() || null,
        typicalTimeframe: createDto.typicalTimeframe?.trim() || null,
        notes: createDto.notes?.trim() || null,
        isActive: true,
      },
    });

    return strategy;
  }

  /**
   * Lista las estrategias de un usuario con filtros y paginación.
   * @param userId ID del usuario
   * @param query Objeto de consulta con filtros y paginación
   * @returns Lista de estrategias con metadata de paginación
   */
  async findAll(userId: string, query: StrategyListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    // Filtros
    if (query.targetMarket) {
      where.targetMarket = query.targetMarket;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // Búsqueda en name y description
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Contar total
    const total = await this.prisma.strategy.count({ where });

    // Obtener estrategias
    const strategies = await this.prisma.strategy.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { setups: true },
        },
      },
    });

    // Formatear respuesta con setupCount
    const data = strategies.map((strategy) => ({
      ...strategy,
      setupCount: strategy._count.setups,
      _count: undefined,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene una estrategia por ID.
   * Valida que pertenezca al usuario.
   * @param id ID de la estrategia
   * @param userId ID del usuario
   * @returns La estrategia encontrada
   */
  async findOne(id: string, userId: string) {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
      include: {
        _count: {
          select: { setups: true },
        },
      },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have access to this strategy');
    }

    return {
      ...strategy,
      setupCount: strategy._count.setups,
      _count: undefined,
    };
  }

  /**
   * Actualiza una estrategia.
   * Valida que pertenezca al usuario.
   * @param id ID de la estrategia
   * @param userId ID del usuario
   * @param updateDto Datos para actualizar
   * @returns La estrategia actualizada
   */
  async update(id: string, userId: string, updateDto: UpdateStrategyDto) {
    // Verificar que existe y pertenece al usuario
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have access to this strategy');
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description?.trim() || null;
    }
    if (updateDto.targetMarket !== undefined) {
      updateData.targetMarket = updateDto.targetMarket?.trim() || null;
    }
    if (updateDto.typicalTimeframe !== undefined) {
      updateData.typicalTimeframe = updateDto.typicalTimeframe?.trim() || null;
    }
    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes?.trim() || null;
    }

    const updated = await this.prisma.strategy.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { setups: true },
        },
      },
    });

    return {
      ...updated,
      setupCount: updated._count.setups,
      _count: undefined,
    };
  }

  /**
   * Elimina una estrategia (soft delete).
   * Valida que pertenezca al usuario.
   * @param id ID de la estrategia
   * @param userId ID del usuario
   */
  async delete(id: string, userId: string) {
    // Verificar que existe y pertenece al usuario
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have access to this strategy');
    }

    // Soft delete
    await this.prisma.strategy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Cuenta los setups asociados a una estrategia.
   * @param id ID de la estrategia
   * @param userId ID del usuario
   * @returns Número de setups asociados
   */
  async getSetupCount(id: string, userId: string): Promise<number> {
    const strategy = await this.findOne(id, userId);
    return strategy.setupCount || 0;
  }
}


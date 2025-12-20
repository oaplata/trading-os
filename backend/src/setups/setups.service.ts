import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSetupDto } from './dto/create-setup.dto';
import { UpdateSetupDto } from './dto/update-setup.dto';
import { SetupListQueryDto } from './dto/setup-list-query.dto';

@Injectable()
export class SetupsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo setup.
   * Valida que la estrategia exista y pertenezca al usuario si se proporciona strategyId.
   * @param userId ID del usuario propietario
   * @param createDto Datos para crear el setup
   * @returns El setup creado
   */
  async create(userId: string, createDto: CreateSetupDto) {
    // Validar strategyId si se proporciona
    if (createDto.strategyId) {
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: createDto.strategyId },
      });

      if (!strategy) {
        throw new NotFoundException(
          `Strategy with ID ${createDto.strategyId} not found`,
        );
      }

      if (strategy.userId !== userId) {
        throw new ForbiddenException(
          'You do not have access to this strategy',
        );
      }
    }

    const setup = await this.prisma.setup.create({
      data: {
        userId,
        strategyId: createDto.strategyId || null,
        name: createDto.name.trim(),
        description: createDto.description?.trim() || null,
        suggestedTags: createDto.suggestedTags || [],
        notes: createDto.notes?.trim() || null,
        isActive: true,
      },
      include: {
        strategy: true,
        _count: {
          select: { rules: true },
        },
      },
    });

    return {
      ...setup,
      ruleCount: setup._count.rules,
      _count: undefined,
    };
  }

  /**
   * Lista los setups de un usuario con filtros y paginación.
   * @param userId ID del usuario
   * @param query Objeto de consulta con filtros y paginación
   * @returns Lista de setups con metadata de paginación
   */
  async findAll(userId: string, query: SetupListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    // Filtros
    if (query.strategyId) {
      where.strategyId = query.strategyId;
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
    const total = await this.prisma.setup.count({ where });

    // Obtener setups
    const setups = await this.prisma.setup.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: 'desc' },
        { name: 'asc' },
      ],
      include: {
        strategy: true,
        _count: {
          select: { rules: true },
        },
      },
    });

    // Formatear respuesta
    const data = setups.map((setup) => ({
      ...setup,
      ruleCount: setup._count.rules,
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
   * Obtiene un setup por ID con sus reglas ordenadas.
   * Valida que pertenezca al usuario.
   * @param id ID del setup
   * @param userId ID del usuario
   * @returns El setup encontrado con reglas
   */
  async findOne(id: string, userId: string) {
    const setup = await this.prisma.setup.findUnique({
      where: { id },
      include: {
        strategy: true,
        rules: {
          where: { isActive: true },
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: { rules: true },
        },
      },
    });

    if (!setup) {
      throw new NotFoundException(`Setup with ID ${id} not found`);
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    return {
      ...setup,
      ruleCount: setup._count.rules,
      _count: undefined,
    };
  }

  /**
   * Lista los setups de una estrategia.
   * @param strategyId ID de la estrategia
   * @param userId ID del usuario
   * @returns Lista de setups de la estrategia
   */
  async findByStrategy(strategyId: string, userId: string) {
    // Verificar que la estrategia existe y pertenece al usuario
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${strategyId} not found`);
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have access to this strategy');
    }

    const setups = await this.prisma.setup.findMany({
      where: {
        userId,
        strategyId,
        isActive: true,
      },
      include: {
        _count: {
          select: { rules: true },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { name: 'asc' },
      ],
    });

    return setups.map((setup) => ({
      ...setup,
      ruleCount: setup._count.rules,
      _count: undefined,
    }));
  }

  /**
   * Actualiza un setup.
   * Valida que pertenezca al usuario.
   * @param id ID del setup
   * @param userId ID del usuario
   * @param updateDto Datos para actualizar
   * @returns El setup actualizado
   */
  async update(id: string, userId: string, updateDto: UpdateSetupDto) {
    // Verificar que existe y pertenece al usuario
    const setup = await this.prisma.setup.findUnique({
      where: { id },
    });

    if (!setup) {
      throw new NotFoundException(`Setup with ID ${id} not found`);
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    // Validar strategyId si se proporciona
    if (updateDto.strategyId !== undefined) {
      if (updateDto.strategyId) {
        const strategy = await this.prisma.strategy.findUnique({
          where: { id: updateDto.strategyId },
        });

        if (!strategy) {
          throw new NotFoundException(
            `Strategy with ID ${updateDto.strategyId} not found`,
          );
        }

        if (strategy.userId !== userId) {
          throw new ForbiddenException(
            'You do not have access to this strategy',
          );
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description?.trim() || null;
    }
    if (updateDto.strategyId !== undefined) {
      updateData.strategyId = updateDto.strategyId || null;
    }
    if (updateDto.suggestedTags !== undefined) {
      updateData.suggestedTags = updateDto.suggestedTags;
    }
    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes?.trim() || null;
    }

    const updated = await this.prisma.setup.update({
      where: { id },
      data: updateData,
      include: {
        strategy: true,
        _count: {
          select: { rules: true },
        },
      },
    });

    return {
      ...updated,
      ruleCount: updated._count.rules,
      _count: undefined,
    };
  }

  /**
   * Elimina un setup (soft delete).
   * Valida que pertenezca al usuario.
   * @param id ID del setup
   * @param userId ID del usuario
   */
  async delete(id: string, userId: string) {
    // Verificar que existe y pertenece al usuario
    const setup = await this.prisma.setup.findUnique({
      where: { id },
    });

    if (!setup) {
      throw new NotFoundException(`Setup with ID ${id} not found`);
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    // Soft delete
    await this.prisma.setup.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Cuenta las reglas asociadas a un setup.
   * @param id ID del setup
   * @param userId ID del usuario
   * @returns Número de reglas asociadas
   */
  async getRuleCount(id: string, userId: string): Promise<number> {
    const setup = await this.findOne(id, userId);
    return setup.ruleCount || 0;
  }
}


import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RuleListQueryDto } from './dto/rule-list-query.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva regla.
   * Valida que el setup exista y pertenezca al usuario.
   * @param userId ID del usuario propietario
   * @param createDto Datos para crear la regla
   * @returns La regla creada
   */
  async create(userId: string, createDto: CreateRuleDto) {
    // Validar que el setup existe y pertenece al usuario
    const setup = await this.prisma.setup.findUnique({
      where: { id: createDto.setupId },
    });

    if (!setup) {
      throw new NotFoundException(`Setup with ID ${createDto.setupId} not found`);
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    const rule = await this.prisma.rule.create({
      data: {
        userId,
        setupId: createDto.setupId,
        name: createDto.name.trim(),
        description: createDto.description?.trim() || null,
        order: createDto.order ?? 0,
        isRequired: createDto.isRequired ?? false,
        isActive: true,
      },
    });

    return rule;
  }

  /**
   * Lista las reglas de un usuario con filtros.
   * Las reglas se ordenan por `order` y luego por `createdAt`.
   * @param userId ID del usuario
   * @param query Objeto de consulta con filtros
   * @returns Lista de reglas ordenadas
   */
  async findAll(userId: string, query: RuleListQueryDto) {
    const where: any = {
      userId,
    };

    // Filtros
    if (query.setupId) {
      where.setupId = query.setupId;
    }

    if (query.isRequired !== undefined) {
      where.isRequired = query.isRequired;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // Obtener reglas ordenadas
    const rules = await this.prisma.rule.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return rules;
  }

  /**
   * Obtiene una regla por ID.
   * Valida que pertenezca al usuario.
   * @param id ID de la regla
   * @param userId ID del usuario
   * @returns La regla encontrada
   */
  async findOne(id: string, userId: string) {
    const rule = await this.prisma.rule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    if (rule.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rule');
    }

    return rule;
  }

  /**
   * Lista las reglas de un setup ordenadas.
   * @param setupId ID del setup
   * @param userId ID del usuario
   * @returns Lista de reglas del setup ordenadas
   */
  async findBySetup(setupId: string, userId: string) {
    // Verificar que el setup existe y pertenece al usuario
    const setup = await this.prisma.setup.findUnique({
      where: { id: setupId },
    });

    if (!setup) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    const rules = await this.prisma.rule.findMany({
      where: {
        userId,
        setupId,
        isActive: true,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return rules;
  }

  /**
   * Actualiza una regla.
   * Valida que pertenezca al usuario.
   * No permite cambiar el setupId.
   * @param id ID de la regla
   * @param userId ID del usuario
   * @param updateDto Datos para actualizar
   * @returns La regla actualizada
   */
  async update(id: string, userId: string, updateDto: UpdateRuleDto) {
    // Verificar que existe y pertenece al usuario
    const rule = await this.prisma.rule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    if (rule.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rule');
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description?.trim() || null;
    }
    if (updateDto.order !== undefined) {
      updateData.order = updateDto.order;
    }
    if (updateDto.isRequired !== undefined) {
      updateData.isRequired = updateDto.isRequired;
    }

    const updated = await this.prisma.rule.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Elimina una regla (soft delete).
   * Valida que pertenezca al usuario.
   * @param id ID de la regla
   * @param userId ID del usuario
   */
  async delete(id: string, userId: string) {
    // Verificar que existe y pertenece al usuario
    const rule = await this.prisma.rule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    if (rule.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rule');
    }

    // Soft delete
    await this.prisma.rule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Reordena las reglas de un setup.
   * Valida que el setup y todas las reglas pertenezcan al usuario.
   * @param userId ID del usuario
   * @param reorderDto Datos con setupId y array de ruleIds en el orden deseado
   * @returns Lista de reglas reordenadas
   */
  async reorder(userId: string, reorderDto: ReorderRulesDto) {
    // Verificar que el setup existe y pertenece al usuario
    const setup = await this.prisma.setup.findUnique({
      where: { id: reorderDto.setupId },
    });

    if (!setup) {
      throw new NotFoundException(
        `Setup with ID ${reorderDto.setupId} not found`,
      );
    }

    if (setup.userId !== userId) {
      throw new ForbiddenException('You do not have access to this setup');
    }

    // Verificar que todas las reglas existen, pertenecen al usuario y al setup
    const rules = await this.prisma.rule.findMany({
      where: {
        id: { in: reorderDto.ruleIds },
        userId,
        setupId: reorderDto.setupId,
      },
    });

    if (rules.length !== reorderDto.ruleIds.length) {
      throw new BadRequestException(
        'Some rules not found or do not belong to this setup',
      );
    }

    // Actualizar el orden de cada regla
    const updatePromises = reorderDto.ruleIds.map((ruleId, index) =>
      this.prisma.rule.update({
        where: { id: ruleId },
        data: { order: index },
      }),
    );

    await Promise.all(updatePromises);

    // Retornar las reglas reordenadas
    return this.findBySetup(reorderDto.setupId, userId);
  }
}


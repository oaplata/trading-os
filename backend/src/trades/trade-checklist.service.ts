import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

@Injectable()
export class TradeChecklistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Actualiza el checklist de un trade.
   */
  async updateChecklist(tradeId: string, userId: string, updateDto: UpdateChecklistDto) {
    // Validar trade pertenece al usuario
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        setup: {
          include: {
            rules: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
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

    // Si el trade tiene setup, validar que las reglas pertenezcan al setup
    if (trade.setupId && trade.setup) {
      const setupRuleIds = trade.setup.rules.map((r) => r.id);
      const invalidRules = updateDto.checklist.filter(
        (item) => !setupRuleIds.includes(item.ruleId),
      );
      if (invalidRules.length > 0) {
        throw new BadRequestException(
          `Las siguientes reglas no pertenecen al setup: ${invalidRules.map((r) => r.ruleId).join(', ')}`,
        );
      }
    }

    // Crear/actualizar checklist items
    await Promise.all(
      updateDto.checklist.map((item) =>
        this.prisma.tradeChecklist.upsert({
          where: {
            tradeId_ruleId: {
              tradeId,
              ruleId: item.ruleId,
            },
          },
          create: {
            tradeId,
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

    // Verificar si todas las reglas requeridas están completas
    if (trade.setupId && trade.setup) {
      const requiredRules = trade.setup.rules.filter((r) => r.isRequired);
      const checklistItems = await this.prisma.tradeChecklist.findMany({
        where: {
          tradeId,
          ruleId: { in: requiredRules.map((r) => r.id) },
        },
      });

      const allRequiredCompleted =
        requiredRules.length > 0 &&
        requiredRules.every((rule) => {
          const item = checklistItems.find((ci) => ci.ruleId === rule.id);
          return item?.completed === true;
        });

      // Actualizar checklistCompleted en el trade
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: { checklistCompleted: allRequiredCompleted },
      });
    }

    // Retornar checklist actualizado
    return this.getChecklist(tradeId, userId);
  }

  /**
   * Obtiene el checklist de un trade.
   */
  async getChecklist(tradeId: string, userId: string) {
    // Validar trade pertenece al usuario
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        setup: {
          include: {
            rules: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
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

    // Si no hay setup, retornar array vacío
    if (!trade.setupId || !trade.setup) {
      return [];
    }

    // Obtener checklist items existentes
    const checklistItems = await this.prisma.tradeChecklist.findMany({
      where: { tradeId },
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
    });

    // Crear checklist completo con todas las reglas del setup
    const checklist = trade.setup.rules.map((rule) => {
      const existingItem = checklistItems.find((item) => item.ruleId === rule.id);
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleDescription: rule.description,
        order: rule.order,
        isRequired: rule.isRequired,
        completed: existingItem?.completed || false,
        notes: existingItem?.notes || null,
      };
    });

    return checklist;
  }
}


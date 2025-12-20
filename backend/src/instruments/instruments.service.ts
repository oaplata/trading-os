import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { InstrumentListQueryDto } from './dto/instrument-list-query.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InstrumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera el ticker normalizado en formato MARKET:SYMBOL
   * @param market Mercado del instrumento
   * @param symbol Símbolo del instrumento
   * @returns Ticker normalizado
   */
  private generateTicker(market: string, symbol: string): string {
    return `${market.toUpperCase()}:${symbol.toUpperCase()}`;
  }

  /**
   * Crea un nuevo instrumento.
   * Valida que el ticker no exista para el usuario y normaliza los campos.
   * @param userId ID del usuario propietario
   * @param createDto Datos para crear el instrumento
   * @returns El instrumento creado
   */
  async create(userId: string, createDto: CreateInstrumentDto) {
    // Normalizar market y symbol a uppercase
    const market = createDto.market.toUpperCase().trim();
    const symbol = createDto.symbol.toUpperCase().trim();
    const ticker = this.generateTicker(market, symbol);

    // Verificar que el ticker no exista para este usuario
    const existing = await this.prisma.instrument.findUnique({
      where: {
        userId_ticker: {
          userId,
          ticker,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Instrument with ticker ${ticker} already exists for this user`,
      );
    }

    const instrument = await this.prisma.instrument.create({
      data: {
        userId,
        market,
        symbol,
        ticker,
        name: createDto.name.trim(),
        type: createDto.type,
        currencyQuote: createDto.currencyQuote.toUpperCase().trim(),
        tickSize: createDto.tickSize ? new Decimal(createDto.tickSize) : null,
        contractSize: createDto.contractSize
          ? new Decimal(createDto.contractSize)
          : null,
        notes: createDto.notes?.trim() || null,
        isActive: true,
      },
    });

    return {
      ...instrument,
      tickSize: instrument.tickSize ? Number(instrument.tickSize) : null,
      contractSize: instrument.contractSize
        ? Number(instrument.contractSize)
        : null,
    };
  }

  /**
   * Lista los instrumentos de un usuario con filtros y paginación.
   * @param userId ID del usuario
   * @param query Objeto de consulta con filtros y paginación
   * @returns Lista de instrumentos con metadata de paginación
   */
  async findAll(userId: string, query: InstrumentListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    // Filtros
    if (query.market) {
      where.market = query.market.toUpperCase();
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else {
      // Por defecto, solo mostrar activos si no se especifica
      where.isActive = true;
    }

    // Búsqueda en name, symbol o ticker
    if (query.search) {
      const searchTerm = query.search.toUpperCase();
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { symbol: { contains: searchTerm } },
        { ticker: { contains: searchTerm } },
      ];
    }

    const total = await this.prisma.instrument.count({ where });

    const instruments = await this.prisma.instrument.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { ticker: 'asc' },
      ],
      skip,
      take: limit,
    });

    return {
      data: instruments.map((instrument) => ({
        ...instrument,
        tickSize: instrument.tickSize ? Number(instrument.tickSize) : null,
        contractSize: instrument.contractSize
          ? Number(instrument.contractSize)
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un instrumento por su ID, verificando la propiedad del usuario.
   * @param id ID del instrumento
   * @param userId ID del usuario propietario
   * @returns El instrumento encontrado
   */
  async findOne(id: string, userId: string) {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id },
    });

    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    if (instrument.userId !== userId) {
      throw new ForbiddenException('You do not have access to this instrument');
    }

    return {
      ...instrument,
      tickSize: instrument.tickSize ? Number(instrument.tickSize) : null,
      contractSize: instrument.contractSize
        ? Number(instrument.contractSize)
        : null,
    };
  }

  /**
   * Busca un instrumento por su ticker normalizado.
   * @param ticker Ticker en formato MARKET:SYMBOL
   * @param userId ID del usuario propietario
   * @returns El instrumento encontrado
   */
  async findByTicker(ticker: string, userId: string) {
    const normalizedTicker = ticker.toUpperCase().trim();

    const instrument = await this.prisma.instrument.findUnique({
      where: {
        userId_ticker: {
          userId,
          ticker: normalizedTicker,
        },
      },
    });

    if (!instrument) {
      throw new NotFoundException(
        `Instrument with ticker ${normalizedTicker} not found`,
      );
    }

    return {
      ...instrument,
      tickSize: instrument.tickSize ? Number(instrument.tickSize) : null,
      contractSize: instrument.contractSize
        ? Number(instrument.contractSize)
        : null,
    };
  }

  /**
   * Actualiza un instrumento existente, verificando la propiedad del usuario.
   * No permite cambiar market y symbol (deben crear un nuevo instrumento).
   * @param id ID del instrumento a actualizar
   * @param userId ID del usuario propietario
   * @param updateDto Datos para actualizar el instrumento
   * @returns El instrumento actualizado
   */
  async update(id: string, userId: string, updateDto: UpdateInstrumentDto) {
    const existing = await this.findOne(id, userId);

    // Normalizar currencyQuote si se proporciona
    const currencyQuote = updateDto.currencyQuote
      ? updateDto.currencyQuote.toUpperCase().trim()
      : existing.currencyQuote;

    const updated = await this.prisma.instrument.update({
      where: { id },
      data: {
        name: updateDto.name?.trim() || existing.name,
        type: updateDto.type ?? existing.type,
        currencyQuote,
        tickSize: updateDto.tickSize
          ? new Decimal(updateDto.tickSize)
          : existing.tickSize,
        contractSize: updateDto.contractSize
          ? new Decimal(updateDto.contractSize)
          : existing.contractSize,
        isActive: updateDto.isActive ?? existing.isActive,
        notes: updateDto.notes?.trim() ?? existing.notes,
      },
    });

    return {
      ...updated,
      tickSize: updated.tickSize ? Number(updated.tickSize) : null,
      contractSize: updated.contractSize ? Number(updated.contractSize) : null,
    };
  }

  /**
   * Elimina un instrumento (soft delete), verificando la propiedad del usuario.
   * @param id ID del instrumento a eliminar
   * @param userId ID del usuario propietario
   */
  async delete(id: string, userId: string) {
    await this.findOne(id, userId); // Verifica propiedad y existencia

    await this.prisma.instrument.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Búsqueda rápida para autocomplete.
   * @param userId ID del usuario
   * @param query Término de búsqueda
   * @param limit Límite de resultados (default: 10)
   * @returns Lista limitada de instrumentos
   */
  async search(userId: string, query: string, limit: number = 10) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toUpperCase().trim();

    const instruments = await this.prisma.instrument.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { symbol: { contains: searchTerm } },
          { ticker: { contains: searchTerm } },
        ],
      },
      orderBy: [
        { name: 'asc' },
        { ticker: 'asc' },
      ],
      take: limit,
    });

    return instruments.map((instrument) => ({
      ...instrument,
      tickSize: instrument.tickSize ? Number(instrument.tickSize) : null,
      contractSize: instrument.contractSize
        ? Number(instrument.contractSize)
        : null,
    }));
  }
}


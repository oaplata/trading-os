import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InstrumentsService } from './instruments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { InstrumentListQueryDto } from './dto/instrument-list-query.dto';
import { InstrumentResponseDto } from './dto/instrument-response.dto';

@ApiTags('instruments')
@ApiBearerAuth('JWT-auth')
@Controller('instruments')
@UseGuards(JwtAuthGuard)
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo instrumento' })
  @ApiResponse({
    status: 201,
    description: 'Instrumento creado exitosamente',
    type: InstrumentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 409, description: 'Ticker duplicado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Req() req: any, @Body() createInstrumentDto: CreateInstrumentDto) {
    return this.instrumentsService.create(req.user.sub, createInstrumentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar instrumentos con filtros y paginación' })
  @ApiQuery({
    name: 'market',
    required: false,
    type: String,
    description: 'Filtrar por mercado',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['CRYPTO', 'STOCK', 'ETF', 'FOREX', 'FUTURES', 'OPTIONS'],
    description: 'Filtrar por tipo de instrumento',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Búsqueda en name, symbol o ticker',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo/inactivo',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados por página',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de instrumentos con paginación',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any, @Query() query: InstrumentListQueryDto) {
    return this.instrumentsService.findAll(req.user.sub, query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda rápida de instrumentos (autocomplete)' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Término de búsqueda',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de instrumentos encontrados',
    type: [InstrumentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async search(
    @Req() req: any,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.instrumentsService.search(req.user.sub, query, limit ? Number(limit) : 10);
  }

  @Get('ticker/:ticker')
  @ApiOperation({ summary: 'Buscar instrumento por ticker normalizado' })
  @ApiParam({
    name: 'ticker',
    description: 'Ticker en formato MARKET:SYMBOL (ej: BINANCE:BTCUSDT)',
  })
  @ApiResponse({
    status: 200,
    description: 'Instrumento encontrado',
    type: InstrumentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Instrumento no encontrado' })
  async findByTicker(@Req() req: any, @Param('ticker') ticker: string) {
    return this.instrumentsService.findByTicker(ticker, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener instrumento por ID' })
  @ApiParam({ name: 'id', description: 'ID del instrumento' })
  @ApiResponse({
    status: 200,
    description: 'Instrumento encontrado',
    type: InstrumentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Instrumento no encontrado' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.instrumentsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar instrumento' })
  @ApiParam({ name: 'id', description: 'ID del instrumento' })
  @ApiResponse({
    status: 200,
    description: 'Instrumento actualizado exitosamente',
    type: InstrumentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Instrumento no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateInstrumentDto: UpdateInstrumentDto,
  ) {
    return this.instrumentsService.update(id, req.user.sub, updateInstrumentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar instrumento (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del instrumento' })
  @ApiResponse({ status: 204, description: 'Instrumento eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Instrumento no encontrado' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.instrumentsService.delete(id, req.user.sub);
  }
}


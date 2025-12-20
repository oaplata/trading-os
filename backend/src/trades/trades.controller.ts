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
import { TradesService } from './trades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { TradeListQueryDto } from './dto/trade-list-query.dto';
import { TradeResponseDto } from './dto/trade-response.dto';
import { CloseTradeDto } from './dto/close-trade.dto';

@ApiTags('trades')
@ApiBearerAuth('JWT-auth')
@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo trade planificado' })
  @ApiResponse({
    status: 201,
    description: 'Trade creado exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cuenta o instrumento no encontrado' })
  async create(@Req() req: any, @Body() createTradeDto: CreateTradeDto) {
    return this.tradesService.create(req.user.sub, createTradeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar trades con filtros y paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trades',
    type: [TradeResponseDto],
  })
  async findAll(@Req() req: any, @Query() query: TradeListQueryDto) {
    return this.tradesService.findAll(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener trade por ID' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Trade encontrado',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar trade' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Trade actualizado exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 400, description: 'No se puede editar un trade cerrado' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTradeDto: UpdateTradeDto,
  ) {
    return this.tradesService.update(id, req.user.sub, updateTradeDto);
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abrir trade (PLANNED → OPEN)' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Trade abierto exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden abrir trades en estado PLANNED' })
  async openTrade(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.openTrade(id, req.user.sub);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar trade (OPEN → CLOSED)' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Trade cerrado exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden cerrar trades en estado OPEN' })
  @ApiResponse({ status: 400, description: 'No se puede cerrar si hay cantidad abierta' })
  async closeTrade(@Req() req: any, @Param('id') id: string, @Body() closeDto: CloseTradeDto) {
    return this.tradesService.closeTrade(id, req.user.sub, closeDto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar trade (PLANNED → CANCELED)' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Trade cancelado exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden cancelar trades en estado PLANNED' })
  async cancelTrade(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.cancelTrade(id, req.user.sub);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicar trade' })
  @ApiParam({ name: 'id', description: 'ID del trade a duplicar' })
  @ApiResponse({
    status: 201,
    description: 'Trade duplicado exitosamente',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  async duplicateTrade(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.duplicateTrade(id, req.user.sub);
  }
}


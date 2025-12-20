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
import { StrategiesService } from './strategies.service';
import { SetupsService } from '../setups/setups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { StrategyListQueryDto } from './dto/strategy-list-query.dto';
import { StrategyResponseDto } from './dto/strategy-response.dto';

@ApiTags('strategies')
@ApiBearerAuth('JWT-auth')
@Controller('strategies')
@UseGuards(JwtAuthGuard)
export class StrategiesController {
  constructor(
    private readonly strategiesService: StrategiesService,
    private readonly setupsService: SetupsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva estrategia' })
  @ApiResponse({
    status: 201,
    description: 'Estrategia creada exitosamente',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Req() req: any, @Body() createStrategyDto: CreateStrategyDto) {
    return this.strategiesService.create(req.user.sub, createStrategyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar estrategias con filtros y paginación' })
  @ApiQuery({
    name: 'targetMarket',
    required: false,
    type: String,
    description: 'Filtrar por mercado objetivo',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Búsqueda en nombre y descripción',
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
    description: 'Lista de estrategias con paginación',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any, @Query() query: StrategyListQueryDto) {
    return this.strategiesService.findAll(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener estrategia por ID' })
  @ApiParam({ name: 'id', description: 'ID de la estrategia' })
  @ApiResponse({
    status: 200,
    description: 'Estrategia encontrada',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.strategiesService.findOne(id, req.user.sub);
  }

  @Get(':id/setups')
  @ApiOperation({ summary: 'Listar setups de una estrategia' })
  @ApiParam({ name: 'id', description: 'ID de la estrategia' })
  @ApiResponse({
    status: 200,
    description: 'Lista de setups de la estrategia',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  async getSetups(@Req() req: any, @Param('id') id: string) {
    return this.setupsService.findByStrategy(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar estrategia' })
  @ApiParam({ name: 'id', description: 'ID de la estrategia' })
  @ApiResponse({
    status: 200,
    description: 'Estrategia actualizada exitosamente',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStrategyDto: UpdateStrategyDto,
  ) {
    return this.strategiesService.update(id, req.user.sub, updateStrategyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar estrategia (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID de la estrategia' })
  @ApiResponse({ status: 204, description: 'Estrategia eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.strategiesService.delete(id, req.user.sub);
  }
}


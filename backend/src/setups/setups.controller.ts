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
import { SetupsService } from './setups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSetupDto } from './dto/create-setup.dto';
import { UpdateSetupDto } from './dto/update-setup.dto';
import { SetupListQueryDto } from './dto/setup-list-query.dto';
import { SetupResponseDto } from './dto/setup-response.dto';

@ApiTags('setups')
@ApiBearerAuth('JWT-auth')
@Controller('setups')
@UseGuards(JwtAuthGuard)
export class SetupsController {
  constructor(private readonly setupsService: SetupsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo setup' })
  @ApiResponse({
    status: 201,
    description: 'Setup creado exitosamente',
    type: SetupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado a la estrategia' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Req() req: any, @Body() createSetupDto: CreateSetupDto) {
    return this.setupsService.create(req.user.sub, createSetupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar setups con filtros y paginación' })
  @ApiQuery({
    name: 'strategyId',
    required: false,
    type: String,
    description: 'Filtrar por ID de estrategia',
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
    description: 'Lista de setups con paginación',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any, @Query() query: SetupListQueryDto) {
    return this.setupsService.findAll(req.user.sub, query);
  }

  @Get('strategy/:strategyId')
  @ApiOperation({ summary: 'Listar setups de una estrategia' })
  @ApiParam({ name: 'strategyId', description: 'ID de la estrategia' })
  @ApiResponse({
    status: 200,
    description: 'Lista de setups de la estrategia',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estrategia no encontrada' })
  async findByStrategy(@Req() req: any, @Param('strategyId') strategyId: string) {
    return this.setupsService.findByStrategy(strategyId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener setup por ID con reglas' })
  @ApiParam({ name: 'id', description: 'ID del setup' })
  @ApiResponse({
    status: 200,
    description: 'Setup encontrado con reglas',
    type: SetupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.setupsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar setup' })
  @ApiParam({ name: 'id', description: 'ID del setup' })
  @ApiResponse({
    status: 200,
    description: 'Setup actualizado exitosamente',
    type: SetupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateSetupDto: UpdateSetupDto,
  ) {
    return this.setupsService.update(id, req.user.sub, updateSetupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar setup (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del setup' })
  @ApiResponse({ status: 204, description: 'Setup eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.setupsService.delete(id, req.user.sub);
  }
}


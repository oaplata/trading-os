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
import { RulesService } from './rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RuleListQueryDto } from './dto/rule-list-query.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';
import { RuleResponseDto } from './dto/rule-response.dto';

@ApiTags('rules')
@ApiBearerAuth('JWT-auth')
@Controller('rules')
@UseGuards(JwtAuthGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva regla' })
  @ApiResponse({
    status: 201,
    description: 'Regla creada exitosamente',
    type: RuleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado al setup' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Req() req: any, @Body() createRuleDto: CreateRuleDto) {
    return this.rulesService.create(req.user.sub, createRuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reglas con filtros (ordenadas)' })
  @ApiQuery({
    name: 'setupId',
    required: false,
    type: String,
    description: 'Filtrar por ID de setup',
  })
  @ApiQuery({
    name: 'isRequired',
    required: false,
    type: Boolean,
    description: 'Filtrar solo reglas obligatorias',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo/inactivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reglas ordenadas',
    type: [RuleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any, @Query() query: RuleListQueryDto) {
    return this.rulesService.findAll(req.user.sub, query);
  }

  @Get('setup/:setupId')
  @ApiOperation({ summary: 'Listar reglas de un setup (ordenadas)' })
  @ApiParam({ name: 'setupId', description: 'ID del setup' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reglas del setup ordenadas',
    type: [RuleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  async findBySetup(@Req() req: any, @Param('setupId') setupId: string) {
    return this.rulesService.findBySetup(setupId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener regla por ID' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({
    status: 200,
    description: 'Regla encontrada',
    type: RuleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.rulesService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar regla' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({
    status: 200,
    description: 'Regla actualizada exitosamente',
    type: RuleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateRuleDto,
  ) {
    return this.rulesService.update(id, req.user.sub, updateRuleDto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reordenar reglas de un setup' })
  @ApiResponse({
    status: 200,
    description: 'Reglas reordenadas exitosamente',
    type: [RuleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Setup no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async reorder(@Req() req: any, @Body() reorderDto: ReorderRulesDto) {
    return this.rulesService.reorder(req.user.sub, reorderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar regla (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({ status: 204, description: 'Regla eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.rulesService.delete(id, req.user.sub);
  }
}


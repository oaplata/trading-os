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
import { CashflowsService } from './cashflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { CashflowListQueryDto } from './dto/cashflow-list-query.dto';
import { CashflowResponseDto } from './dto/cashflow-response.dto';

@ApiTags('cashflows')
@ApiBearerAuth('JWT-auth')
@Controller('cashflows')
@UseGuards(JwtAuthGuard)
export class CashflowsController {
  constructor(private readonly cashflowsService: CashflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cashflow' })
  @ApiResponse({
    status: 201,
    description: 'Cashflow creado exitosamente',
    type: CashflowResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o moneda no coincide' })
  async create(@Req() req: any, @Body() createCashflowDto: CreateCashflowDto) {
    return this.cashflowsService.create(req.user.sub, createCashflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cashflows con filtros y paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cashflows con paginación',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any, @Query() query: CashflowListQueryDto) {
    return this.cashflowsService.findAll(req.user.sub, query);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Obtener timeline de cashflows' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filtrar por cuenta' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin' })
  @ApiResponse({ status: 200, description: 'Timeline de cashflows' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getTimeline(
    @Req() req: any,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cashflowsService.getTimeline(
      req.user.sub,
      accountId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('account/:accountId/total')
  @ApiOperation({ summary: 'Obtener total de cashflows por cuenta' })
  @ApiParam({ name: 'accountId', description: 'ID de la cuenta' })
  @ApiResponse({ status: 200, description: 'Total de cashflows' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  async getTotalByAccount(@Req() req: any, @Param('accountId') accountId: string) {
    const total = await this.cashflowsService.getTotalByAccount(accountId, req.user.sub);
    return { accountId, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cashflow por ID' })
  @ApiParam({ name: 'id', description: 'ID del cashflow' })
  @ApiResponse({
    status: 200,
    description: 'Cashflow encontrado',
    type: CashflowResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cashflow no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este cashflow' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.cashflowsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cashflow' })
  @ApiParam({ name: 'id', description: 'ID del cashflow' })
  @ApiResponse({
    status: 200,
    description: 'Cashflow actualizado exitosamente',
    type: CashflowResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cashflow no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este cashflow' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateCashflowDto: UpdateCashflowDto,
  ) {
    return this.cashflowsService.update(id, req.user.sub, updateCashflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cashflow' })
  @ApiParam({ name: 'id', description: 'ID del cashflow' })
  @ApiResponse({ status: 200, description: 'Cashflow eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cashflow no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este cashflow' })
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.cashflowsService.delete(id, req.user.sub);
  }
}


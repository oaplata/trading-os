import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDetailResponseDto } from './dto/account-detail-response.dto';

@ApiTags('accounts')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly snapshotsService: SnapshotsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva cuenta' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Req() req: any, @Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(req.user.sub, createAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cuentas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Req() req: any) {
    return this.accountsService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de cuenta con métricas calculadas' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta' })
  @ApiResponse({
    status: 200,
    description: 'Detalle de cuenta con métricas',
    type: AccountDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.accountsService.getAccountDetails(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cuenta' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.update(id, req.user.sub, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar cuenta' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta' })
  @ApiResponse({ status: 200, description: 'Cuenta cerrada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  async closeAccount(@Req() req: any, @Param('id') id: string) {
    return this.accountsService.closeAccount(id, req.user.sub);
  }

  @Post(':id/snapshots/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar snapshots históricos para una cuenta' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (ISO string)' })
  @ApiResponse({ status: 200, description: 'Snapshots regenerados exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  async regenerateSnapshots(
    @Req() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Verificar que la cuenta pertenece al usuario
    await this.accountsService.findOne(id, req.user.sub);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : new Date();

    const count = await this.snapshotsService.regenerateHistoricalSnapshots(id, start, end);

    return {
      message: 'Snapshots regenerated successfully',
      accountId: id,
      count,
      startDate: start?.toISOString(),
      endDate: end.toISOString(),
    };
  }
}

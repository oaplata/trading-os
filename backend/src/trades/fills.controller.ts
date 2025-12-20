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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FillsService } from './fills.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFillDto } from './dto/create-fill.dto';
import { UpdateFillDto } from './dto/update-fill.dto';
import { FillResponseDto } from './dto/fill-response.dto';

@ApiTags('fills')
@ApiBearerAuth('JWT-auth')
@Controller('fills')
@UseGuards(JwtAuthGuard)
export class FillsController {
  constructor(private readonly fillsService: FillsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo fill' })
  @ApiResponse({
    status: 201,
    description: 'Fill creado exitosamente',
    type: FillResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  async create(@Req() req: any, @Body() createFillDto: CreateFillDto) {
    return this.fillsService.create(req.user.sub, createFillDto);
  }

  @Get('trade/:tradeId')
  @ApiOperation({ summary: 'Listar fills de un trade' })
  @ApiParam({ name: 'tradeId', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de fills',
    type: [FillResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  async findAllByTrade(@Req() req: any, @Param('tradeId') tradeId: string) {
    return this.fillsService.findAllByTrade(tradeId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener fill por ID' })
  @ApiParam({ name: 'id', description: 'ID del fill' })
  @ApiResponse({
    status: 200,
    description: 'Fill encontrado',
    type: FillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Fill no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.fillsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar fill' })
  @ApiParam({ name: 'id', description: 'ID del fill' })
  @ApiResponse({
    status: 200,
    description: 'Fill actualizado exitosamente',
    type: FillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Fill no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateFillDto: UpdateFillDto,
  ) {
    return this.fillsService.update(id, req.user.sub, updateFillDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar fill' })
  @ApiParam({ name: 'id', description: 'ID del fill' })
  @ApiResponse({ status: 204, description: 'Fill eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Fill no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.fillsService.delete(id, req.user.sub);
  }
}


import {
  Controller,
  Get,
  Patch,
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
import { TradeChecklistService } from './trade-checklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

@ApiTags('trades')
@ApiBearerAuth('JWT-auth')
@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradeChecklistController {
  constructor(private readonly tradeChecklistService: TradeChecklistService) {}

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Obtener checklist de un trade' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Checklist del trade',
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getChecklist(@Req() req: any, @Param('id') id: string) {
    return this.tradeChecklistService.getChecklist(id, req.user.sub);
  }

  @Patch(':id/checklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar checklist de un trade' })
  @ApiParam({ name: 'id', description: 'ID del trade' })
  @ApiResponse({
    status: 200,
    description: 'Checklist actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Trade no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 400, description: 'Reglas inválidas' })
  async updateChecklist(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateChecklistDto,
  ) {
    return this.tradeChecklistService.updateChecklist(id, req.user.sub, updateDto);
  }
}


import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch('me/settings')
  @ApiOperation({ summary: 'Actualizar configuración del usuario' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateSettings(@Req() req: any, @Body() updateSettingsDto: UpdateSettingsDto) {
    return this.usersService.updateSettings(req.user.sub, updateSettingsDto);
  }
}


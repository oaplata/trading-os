import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por email',
    example: 'reset-token-from-email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña (mínimo 8 caracteres, debe contener mayúscula, minúscula, número y símbolo)',
    example: 'NewPassword123!@#',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}


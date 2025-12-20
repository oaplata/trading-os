import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email del usuario para recuperar contraseña',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}


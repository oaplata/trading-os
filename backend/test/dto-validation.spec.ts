import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { LoginDto } from '../src/auth/dto/login.dto';
import { RefreshTokenDto } from '../src/auth/dto/refresh-token.dto';
import { ForgotPasswordDto } from '../src/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../src/auth/dto/reset-password.dto';
import { UpdateSettingsDto } from '../src/users/dto/update-settings.dto';

describe('DTO Validation', () => {
  describe('RegisterDto', () => {
    it('debería validar email válido', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'Test123!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería rechazar email inválido', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'invalid-email',
        password: 'Test123!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('debería rechazar password corto', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'Short1!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('debería rechazar password sin mayúscula', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'test123!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debería rechazar password sin número', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'TestPassword!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debería rechazar password sin símbolo', async () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('LoginDto', () => {
    it('debería validar email y password válidos', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'test@example.com',
        password: 'anypassword',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería rechazar email inválido', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'invalid-email',
        password: 'password',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debería requerir password', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'test@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RefreshTokenDto', () => {
    it('debería validar refreshToken válido', async () => {
      const dto = plainToInstance(RefreshTokenDto, {
        refreshToken: 'valid-token',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería requerir refreshToken', async () => {
      const dto = plainToInstance(RefreshTokenDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ForgotPasswordDto', () => {
    it('debería validar email válido', async () => {
      const dto = plainToInstance(ForgotPasswordDto, {
        email: 'test@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería rechazar email inválido', async () => {
      const dto = plainToInstance(ForgotPasswordDto, {
        email: 'invalid-email',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ResetPasswordDto', () => {
    it('debería validar token y password válidos', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        password: 'NewPassword123!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería rechazar password débil', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        password: 'weak',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debería requerir token', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        password: 'NewPassword123!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateSettingsDto', () => {
    it('debería validar settings válidos', async () => {
      const dto = plainToInstance(UpdateSettingsDto, {
        timezone: 'America/Bogota',
        baseCurrency: 'USD',
        defaultRiskPercent: 1.5,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debería validar currency enum', async () => {
      const dto = plainToInstance(UpdateSettingsDto, {
        baseCurrency: 'INVALID',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debería validar rango de defaultRiskPercent', async () => {
      const dto = plainToInstance(UpdateSettingsDto, {
        defaultRiskPercent: 150, // Fuera de rango (0.1 - 100)
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});


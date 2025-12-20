import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Mock de argon2
jest.mock('argon2');
const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

// Mock de PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// Mock de JwtService
const mockJwtService = {
  sign: jest.fn(),
};

// Mock de ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '15m',
      REFRESH_TOKEN_SECRET: 'test-refresh-secret',
      REFRESH_TOKEN_EXPIRATION: '7d',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('debería crear un usuario correctamente', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 'user-id',
        email: registerDto.email,
        passwordHash: hashedPassword,
        emailVerified: false,
        settings: {
          id: 'settings-id',
          timezone: 'America/Bogota',
          baseCurrency: 'USD',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockedArgon2.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser as any);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedArgon2.hash).toHaveBeenCalledWith(registerDto.password);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('debería rechazar email duplicado', async () => {
      // Arrange
      const existingUser = {
        id: 'existing-id',
        email: registerDto.email,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser as any);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('debería validar credenciales correctas', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: hashedPassword,
        emailVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockedArgon2.verify.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
      expect(mockedArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        loginDto.password,
      );
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('debería rechazar credenciales incorrectas', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockedArgon2.verify.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('debería rechazar si el usuario no existe', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('debería rotar tokens correctamente', async () => {
      // Arrange
      const mockTokenRecord = {
        id: 'token-id',
        userId: 'user-id',
        token: refreshTokenDto.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        revoked: false,
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: false,
        },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockTokenRecord as any,
      );
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);

      // Act
      const result = await service.refreshToken(refreshTokenDto);

      // Assert
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id },
        data: { revoked: true },
      });
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('debería rechazar token inválido', async () => {
      // Arrange
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería rechazar token expirado', async () => {
      // Arrange
      const expiredToken = {
        id: 'token-id',
        token: refreshTokenDto.refreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expirado
        revoked: false,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        expiredToken as any,
      );

      // Act & Assert
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería rechazar token revocado', async () => {
      // Arrange
      const revokedToken = {
        id: 'token-id',
        token: refreshTokenDto.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: true,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        revokedToken as any,
      );

      // Act & Assert
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('debería revocar el refresh token', async () => {
      // Arrange
      const userId = 'user-id';
      const refreshToken = 'refresh-token';

      mockPrismaService.refreshToken.updateMany.mockResolvedValue({
        count: 1,
      } as any);

      // Act
      await service.logout(userId, refreshToken);

      // Assert
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          token: refreshToken,
        },
        data: {
          revoked: true,
        },
      });
    });
  });

  describe('forgotPassword', () => {
    it('debería generar token de reset', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        email,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrismaService.passwordResetToken.create.mockResolvedValue({} as any);

      // Act
      await service.forgotPassword({ email });

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
    });

    it('no debería lanzar error si el email no existe (seguridad)', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.forgotPassword({ email })).resolves.not.toThrow();
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('debería resetear la contraseña correctamente', async () => {
      // Arrange
      const token = 'valid-token';
      const newPassword = 'NewPassword123!@#';
      const hashedPassword = 'new-hashed-password';

      const mockTokenRecord = {
        id: 'token-id',
        userId: 'user-id',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        used: false,
        user: {
          id: 'user-id',
        },
      };

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(
        mockTokenRecord as any,
      );
      mockedArgon2.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue({} as any);
      mockPrismaService.passwordResetToken.update.mockResolvedValue({} as any);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({
        count: 1,
      } as any);

      // Act
      await service.resetPassword({ token, password: newPassword });

      // Assert
      expect(mockedArgon2.hash).toHaveBeenCalledWith(newPassword);
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id },
        data: { used: true },
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('debería rechazar token inválido', async () => {
      // Arrange
      const token = 'invalid-token';
      const newPassword = 'NewPassword123!@#';

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.resetPassword({ token, password: newPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar token usado', async () => {
      // Arrange
      const token = 'used-token';
      const newPassword = 'NewPassword123!@#';

      const usedToken = {
        id: 'token-id',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
      };

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(
        usedToken as any,
      );

      // Act & Assert
      await expect(
        service.resetPassword({ token, password: newPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});


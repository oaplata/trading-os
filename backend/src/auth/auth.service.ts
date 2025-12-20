import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user and default settings
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        settings: {
          create: {
            timezone: 'America/Bogota',
            baseCurrency: 'USD',
            onboardingCompleted: false,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // Find and validate refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.userId);

    // Store new refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        emailVerified: tokenRecord.user.emailVerified,
      },
    };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        token: refreshToken,
      },
      data: {
        revoked: true,
      },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // TODO: Send email (MVP: log it)
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset link: http://localhost:5173/reset-password?token=${token}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Find and validate token
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await argon2.hash(password);

    // Update password
    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { revoked: true },
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}


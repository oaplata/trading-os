import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.user.deleteMany({
        where: {
          email: {
            in: ['test@example.com', 'test2@example.com'],
          },
        },
      });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('debería registrar un nuevo usuario', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(registerDto.email);

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it('debería rechazar email duplicado', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('debería validar formato de email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('debería validar fortaleza de password', async () => {
      const registerDto = {
        email: 'test3@example.com',
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('debería hacer login con credenciales válidas', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('debería rechazar credenciales incorrectas', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('debería rechazar si el usuario no existe', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('debería refrescar el access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('debería rechazar token inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('debería hacer logout exitosamente', async () => {
      // Obtener un nuevo token para logout
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      const newRefreshToken = loginResponse.body.refreshToken;
      const newAccessToken = loginResponse.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({ refreshToken: newRefreshToken })
        .expect(200);
    });

    it('debería requerir autenticación', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('debería aceptar solicitud de reset (no revela si email existe)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);
    });

    it('debería aceptar incluso si el email no existe (seguridad)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
    });

    it('debería validar formato de email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetToken: string;

    beforeAll(async () => {
      // Crear un token de reset para testing
      const user = await prismaService.user.findUnique({
        where: { email: 'test@example.com' },
      });

      if (user) {
        const token = await prismaService.passwordResetToken.create({
          data: {
            userId: user.id,
            token: 'test-reset-token',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
          },
        });
        resetToken = token.token;
      }
    });

    it('debería resetear la contraseña con token válido', async () => {
      const resetDto = {
        token: resetToken,
        password: 'NewPassword123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send(resetDto)
        .expect(200);

      // Verificar que se puede hacer login con la nueva contraseña
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!@#',
        })
        .expect(200);
    });

    it('debería rechazar token inválido', async () => {
      const resetDto = {
        token: 'invalid-token',
        password: 'NewPassword123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send(resetDto)
        .expect(401);
    });

    it('debería validar fortaleza de password', async () => {
      const resetDto = {
        token: resetToken,
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send(resetDto)
        .expect(400);
    });
  });
});


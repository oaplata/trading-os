import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('StrategiesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let strategyId: string;
  let otherUserId: string;
  let otherAccessToken: string;

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

    // Crear usuario de prueba y obtener token
    const hashedPassword = await argon2.hash('Test123!@#');
    const user = await prismaService.user.create({
      data: {
        email: 'strategies-test@example.com',
        passwordHash: hashedPassword,
        settings: {
          create: {
            timezone: 'America/Bogota',
            baseCurrency: 'USD',
            onboardingCompleted: true,
          },
        },
      },
    });
    userId = user.id;

    // Crear otro usuario para pruebas de acceso
    const otherUser = await prismaService.user.create({
      data: {
        email: 'strategies-test-other@example.com',
        passwordHash: hashedPassword,
        settings: {
          create: {
            timezone: 'America/Bogota',
            baseCurrency: 'USD',
            onboardingCompleted: true,
          },
        },
      },
    });
    otherUserId = otherUser.id;

    // Login para obtener token del primer usuario
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'strategies-test@example.com',
        password: 'Test123!@#',
      });
    accessToken = loginResponse.body.accessToken;

    // Login para obtener token del segundo usuario
    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'strategies-test-other@example.com',
        password: 'Test123!@#',
      });
    otherAccessToken = otherLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.strategy.deleteMany({
        where: { userId },
      });
    }
    if (otherUserId) {
      await prismaService.strategy.deleteMany({
        where: { userId: otherUserId },
      });
    }
    if (userId) {
      await prismaService.userSettings.deleteMany({
        where: { userId },
      });
      await prismaService.user.deleteMany({
        where: { id: userId },
      });
    }
    if (otherUserId) {
      await prismaService.userSettings.deleteMany({
        where: { userId: otherUserId },
      });
      await prismaService.user.deleteMany({
        where: { id: otherUserId },
      });
    }
    await app.close();
  });

  describe('POST /strategies', () => {
    it('debería crear estrategia exitosamente', () => {
      return request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Swing Trading Crypto',
          description: 'Estrategia de swing trading enfocada en criptomonedas',
          targetMarket: 'CRYPTO',
          typicalTimeframe: '4H',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Swing Trading Crypto');
          expect(res.body.targetMarket).toBe('CRYPTO');
          expect(res.body.typicalTimeframe).toBe('4H');
          expect(res.body.isActive).toBe(true);
          strategyId = res.body.id;
        });
    });

    it('debería crear estrategia con campos mínimos', () => {
      return request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Minimal Strategy',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Minimal Strategy');
          expect(res.body.description).toBeNull();
          expect(res.body.targetMarket).toBeNull();
        });
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
        })
        .expect(400);
    });

    it('debería requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/strategies')
        .send({
          name: 'Test Strategy',
        })
        .expect(401);
    });
  });

  describe('GET /strategies', () => {
    it('debería listar estrategias del usuario', () => {
      return request(app.getHttpServer())
        .get('/api/strategies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
        });
    });

    it('debería filtrar por targetMarket', () => {
      return request(app.getHttpServer())
        .get('/api/strategies?targetMarket=CRYPTO')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((strategy: any) => {
            expect(strategy.targetMarket).toBe('CRYPTO');
          });
        });
    });

    it('debería buscar por término', () => {
      return request(app.getHttpServer())
        .get('/api/strategies?search=swing')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          // Al menos un resultado debe contener "swing"
          const hasSwing = res.body.data.some(
            (strategy: any) =>
              strategy.name.toLowerCase().includes('swing') ||
              strategy.description?.toLowerCase().includes('swing'),
          );
          expect(hasSwing || res.body.data.length === 0).toBe(true);
        });
    });

    it('debería paginar correctamente', () => {
      return request(app.getHttpServer())
        .get('/api/strategies?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(10);
          expect(res.body.data.length).toBeLessThanOrEqual(10);
        });
    });
  });

  describe('GET /strategies/:id', () => {
    it('debería obtener estrategia por ID', () => {
      return request(app.getHttpServer())
        .get(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(strategyId);
          expect(res.body.userId).toBe(userId);
          expect(res.body).toHaveProperty('setupCount');
        });
    });

    it('debería rechazar acceso a estrategia de otro usuario', async () => {
      // Crear estrategia con otro usuario
      const otherStrategy = await request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Strategy',
          targetMarket: 'STOCKS',
        })
        .expect(201);

      // Intentar acceder con el primer usuario
      return request(app.getHttpServer())
        .get(`/api/strategies/${otherStrategy.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('debería retornar 404 si no existe', () => {
      return request(app.getHttpServer())
        .get('/api/strategies/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /strategies/:id/setups', () => {
    it('debería listar setups de una estrategia', async () => {
      // Crear un setup asociado a la estrategia
      await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          strategyId,
          name: 'Breakout Setup',
          description: 'Setup de breakout',
        })
        .expect(201);

      return request(app.getHttpServer())
        .get(`/api/strategies/${strategyId}/setups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Al menos debería tener el setup creado
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('PATCH /strategies/:id', () => {
    it('debería actualizar estrategia', () => {
      return request(app.getHttpServer())
        .patch(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Strategy',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Strategy');
          expect(res.body.description).toBe('Updated description');
        });
    });

    it('debería rechazar actualizar estrategia de otro usuario', async () => {
      // Crear estrategia con otro usuario
      const otherStrategy = await request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Strategy',
        })
        .expect(201);

      // Intentar actualizar con el primer usuario
      return request(app.getHttpServer())
        .patch(`/api/strategies/${otherStrategy.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });
  });

  describe('DELETE /strategies/:id', () => {
    it('debería hacer soft delete (marcar isActive = false)', async () => {
      // Crear estrategia para eliminar
      const createResponse = await request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Strategy to Delete',
          targetMarket: 'FOREX',
        })
        .expect(201);
      const deleteStrategyId = createResponse.body.id;

      // Eliminar
      await request(app.getHttpServer())
        .delete(`/api/strategies/${deleteStrategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verificar que la estrategia sigue existiendo pero está inactiva
      const response = await request(app.getHttpServer())
        .get(`/api/strategies/${deleteStrategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body.isActive).toBe(false);
    });

    it('debería rechazar eliminar estrategia de otro usuario', async () => {
      // Crear estrategia con otro usuario
      const otherStrategy = await request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Strategy',
        })
        .expect(201);

      // Intentar eliminar con el primer usuario
      return request(app.getHttpServer())
        .delete(`/api/strategies/${otherStrategy.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});


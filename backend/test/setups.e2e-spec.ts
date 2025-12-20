import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('SetupsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let setupId: string;
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
        email: 'setups-test@example.com',
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
        email: 'setups-test-other@example.com',
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
        email: 'setups-test@example.com',
        password: 'Test123!@#',
      });
    accessToken = loginResponse.body.accessToken;

    // Login para obtener token del segundo usuario
    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'setups-test-other@example.com',
        password: 'Test123!@#',
      });
    otherAccessToken = otherLoginResponse.body.accessToken;

    // Crear estrategia de prueba
    const strategyResponse = await request(app.getHttpServer())
      .post('/api/strategies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Strategy',
        targetMarket: 'CRYPTO',
      });
    strategyId = strategyResponse.body.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.setup.deleteMany({
        where: { userId },
      });
      await prismaService.strategy.deleteMany({
        where: { userId },
      });
    }
    if (otherUserId) {
      await prismaService.setup.deleteMany({
        where: { userId: otherUserId },
      });
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

  describe('POST /setups', () => {
    it('debería crear setup exitosamente', () => {
      return request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          strategyId,
          name: 'Breakout',
          description: 'Setup de breakout cuando el precio rompe resistencia',
          suggestedTags: ['breakout', 'momentum'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Breakout');
          expect(res.body.strategyId).toBe(strategyId);
          expect(res.body.suggestedTags).toEqual(['breakout', 'momentum']);
          expect(res.body.isActive).toBe(true);
          setupId = res.body.id;
        });
    });

    it('debería crear setup sin estrategia', () => {
      return request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Standalone Setup',
          description: 'Setup sin estrategia asociada',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Standalone Setup');
          expect(res.body.strategyId).toBeNull();
        });
    });

    it('debería rechazar si strategyId no existe', () => {
      return request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          strategyId: 'non-existent-id',
          name: 'Test Setup',
        })
        .expect(404);
    });

    it('debería rechazar si strategyId no pertenece al usuario', async () => {
      // Crear estrategia con otro usuario
      const otherStrategy = await request(app.getHttpServer())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Strategy',
        })
        .expect(201);

      // Intentar crear setup con estrategia de otro usuario
      return request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          strategyId: otherStrategy.body.id,
          name: 'Test Setup',
        })
        .expect(403);
    });
  });

  describe('GET /setups', () => {
    it('debería listar setups del usuario', () => {
      return request(app.getHttpServer())
        .get('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('debería filtrar por strategyId', () => {
      return request(app.getHttpServer())
        .get(`/api/setups?strategyId=${strategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((setup: any) => {
            expect(setup.strategyId).toBe(strategyId);
          });
        });
    });

    it('debería buscar por término', () => {
      return request(app.getHttpServer())
        .get('/api/setups?search=breakout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /setups/strategy/:strategyId', () => {
    it('debería listar setups de una estrategia', () => {
      return request(app.getHttpServer())
        .get(`/api/setups/strategy/${strategyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((setup: any) => {
            expect(setup.strategyId).toBe(strategyId);
          });
        });
    });
  });

  describe('GET /setups/:id', () => {
    it('debería obtener setup por ID con reglas', () => {
      return request(app.getHttpServer())
        .get(`/api/setups/${setupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(setupId);
          expect(res.body.userId).toBe(userId);
          expect(res.body).toHaveProperty('rules');
          expect(Array.isArray(res.body.rules)).toBe(true);
        });
    });

    it('debería rechazar acceso a setup de otro usuario', async () => {
      // Crear setup con otro usuario
      const otherSetup = await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Setup',
        })
        .expect(201);

      // Intentar acceder con el primer usuario
      return request(app.getHttpServer())
        .get(`/api/setups/${otherSetup.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /setups/:id', () => {
    it('debería actualizar setup', () => {
      return request(app.getHttpServer())
        .patch(`/api/setups/${setupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Breakout',
          suggestedTags: ['breakout', 'updated'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Breakout');
          expect(res.body.suggestedTags).toEqual(['breakout', 'updated']);
        });
    });

    it('debería rechazar actualizar setup de otro usuario', async () => {
      // Crear setup con otro usuario
      const otherSetup = await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Setup',
        })
        .expect(201);

      // Intentar actualizar con el primer usuario
      return request(app.getHttpServer())
        .patch(`/api/setups/${otherSetup.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });
  });

  describe('DELETE /setups/:id', () => {
    let deleteSetupId: string;

    beforeEach(async () => {
      // Crear setup para eliminar
      const response = await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Setup to Delete',
        })
        .expect(201);
      deleteSetupId = response.body.id;
    });

    it('debería hacer soft delete (marcar isActive = false)', () => {
      return request(app.getHttpServer())
        .delete(`/api/setups/${deleteSetupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
        .then(async () => {
          // Verificar que el setup sigue existiendo pero está inactivo
          const response = await request(app.getHttpServer())
            .get(`/api/setups/${deleteSetupId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
          expect(response.body.isActive).toBe(false);
        });
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('RulesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let ruleId: string;
  let setupId: string;
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
        email: 'rules-test@example.com',
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
        email: 'rules-test-other@example.com',
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
        email: 'rules-test@example.com',
        password: 'Test123!@#',
      });
    accessToken = loginResponse.body.accessToken;

    // Login para obtener token del segundo usuario
    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'rules-test-other@example.com',
        password: 'Test123!@#',
      });
    otherAccessToken = otherLoginResponse.body.accessToken;

    // Crear setup de prueba
    const setupResponse = await request(app.getHttpServer())
      .post('/api/setups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Setup',
        description: 'Setup de prueba',
      });
    setupId = setupResponse.body.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.rule.deleteMany({
        where: { userId },
      });
      await prismaService.setup.deleteMany({
        where: { userId },
      });
    }
    if (otherUserId) {
      await prismaService.rule.deleteMany({
        where: { userId: otherUserId },
      });
      await prismaService.setup.deleteMany({
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

  describe('POST /rules', () => {
    it('debería crear regla exitosamente', () => {
      return request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Price above EMA 20',
          description: 'El precio debe estar por encima de la EMA 20',
          order: 0,
          isRequired: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Price above EMA 20');
          expect(res.body.setupId).toBe(setupId);
          expect(res.body.order).toBe(0);
          expect(res.body.isRequired).toBe(false);
          expect(res.body.isActive).toBe(true);
          ruleId = res.body.id;
        });
    });

    it('debería usar valores por defecto para order e isRequired', () => {
      return request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Minimal Rule',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.order).toBe(0);
          expect(res.body.isRequired).toBe(false);
        });
    });

    it('debería rechazar si setupId no existe', () => {
      return request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId: 'non-existent-id',
          name: 'Test Rule',
        })
        .expect(404);
    });

    it('debería rechazar si setupId no pertenece al usuario', async () => {
      // Crear setup con otro usuario
      const otherSetup = await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Setup',
        })
        .expect(201);

      // Intentar crear regla con setup de otro usuario
      return request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId: otherSetup.body.id,
          name: 'Test Rule',
        })
        .expect(403);
    });
  });

  describe('GET /rules', () => {
    it('debería listar reglas del usuario ordenadas', () => {
      return request(app.getHttpServer())
        .get('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Verificar que están ordenadas por order
          for (let i = 1; i < res.body.length; i++) {
            expect(res.body[i].order).toBeGreaterThanOrEqual(res.body[i - 1].order);
          }
        });
    });

    it('debería filtrar por setupId', () => {
      return request(app.getHttpServer())
        .get(`/api/rules?setupId=${setupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.forEach((rule: any) => {
            expect(rule.setupId).toBe(setupId);
          });
        });
    });

    it('debería filtrar por isRequired', () => {
      return request(app.getHttpServer())
        .get('/api/rules?isRequired=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.forEach((rule: any) => {
            expect(rule.isRequired).toBe(true);
          });
        });
    });
  });

  describe('GET /rules/setup/:setupId', () => {
    it('debería listar reglas de un setup ordenadas', () => {
      return request(app.getHttpServer())
        .get(`/api/rules/setup/${setupId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((rule: any) => {
            expect(rule.setupId).toBe(setupId);
          });
          // Verificar ordenamiento
          for (let i = 1; i < res.body.length; i++) {
            expect(res.body[i].order).toBeGreaterThanOrEqual(res.body[i - 1].order);
          }
        });
    });
  });

  describe('GET /rules/:id', () => {
    it('debería obtener regla por ID', () => {
      return request(app.getHttpServer())
        .get(`/api/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(ruleId);
          expect(res.body.userId).toBe(userId);
        });
    });

    it('debería rechazar acceso a regla de otro usuario', async () => {
      // Crear setup y regla con otro usuario
      const otherSetup = await request(app.getHttpServer())
        .post('/api/setups')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other User Setup',
        })
        .expect(201);

      const otherRule = await request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          setupId: otherSetup.body.id,
          name: 'Other User Rule',
        })
        .expect(201);

      // Intentar acceder con el primer usuario
      return request(app.getHttpServer())
        .get(`/api/rules/${otherRule.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /rules/:id', () => {
    it('debería actualizar regla', () => {
      return request(app.getHttpServer())
        .patch(`/api/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Rule',
          order: 1,
          isRequired: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Rule');
          expect(res.body.order).toBe(1);
          expect(res.body.isRequired).toBe(true);
        });
    });

    it('no debería permitir cambiar setupId', () => {
      return request(app.getHttpServer())
        .patch(`/api/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId: 'new-setup-id',
        })
        .expect(200)
        .expect((res) => {
          // El setupId no debería cambiar
          expect(res.body.setupId).toBe(setupId);
        });
    });
  });

  describe('PATCH /rules/reorder', () => {
    let ruleIds: string[];

    beforeEach(async () => {
      // Crear múltiples reglas para reordenar
      const rule1 = await request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Rule 1',
          order: 0,
        })
        .expect(201);

      const rule2 = await request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Rule 2',
          order: 1,
        })
        .expect(201);

      const rule3 = await request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Rule 3',
          order: 2,
        })
        .expect(201);

      ruleIds = [rule1.body.id, rule2.body.id, rule3.body.id];
    });

    it('debería reordenar reglas correctamente', () => {
      // Reordenar en orden inverso
      const reorderedIds = [...ruleIds].reverse();

      return request(app.getHttpServer())
        .patch('/api/rules/reorder')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          ruleIds: reorderedIds,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
          // Verificar que el orden cambió
          expect(res.body[0].id).toBe(reorderedIds[0]);
          expect(res.body[0].order).toBe(0);
          expect(res.body[1].id).toBe(reorderedIds[1]);
          expect(res.body[1].order).toBe(1);
          expect(res.body[2].id).toBe(reorderedIds[2]);
          expect(res.body[2].order).toBe(2);
        });
    });

    it('debería rechazar si algunas reglas no existen', () => {
      return request(app.getHttpServer())
        .patch('/api/rules/reorder')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          ruleIds: [...ruleIds, 'non-existent-id'],
        })
        .expect(400);
    });
  });

  describe('DELETE /rules/:id', () => {
    let deleteRuleId: string;

    beforeEach(async () => {
      // Crear regla para eliminar
      const response = await request(app.getHttpServer())
        .post('/api/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          setupId,
          name: 'Rule to Delete',
        })
        .expect(201);
      deleteRuleId = response.body.id;
    });

    it('debería hacer soft delete (marcar isActive = false)', () => {
      return request(app.getHttpServer())
        .delete(`/api/rules/${deleteRuleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
        .then(async () => {
          // Verificar que la regla sigue existiendo pero está inactiva
          const response = await request(app.getHttpServer())
            .get(`/api/rules/${deleteRuleId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
          expect(response.body.isActive).toBe(false);
        });
    });
  });
});


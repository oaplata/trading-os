import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let accountId: string;

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
        email: 'accounts-test@example.com',
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

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'accounts-test@example.com',
        password: 'Test123!@#',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.account.deleteMany({
        where: { userId },
      });
      await prismaService.user.delete({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('POST /accounts', () => {
    it('debería crear una cuenta correctamente', async () => {
      const createDto = {
        name: 'Test Account',
        broker: 'Test Broker',
        type: 'FUTURES',
        currency: 'USD',
        initialBalance: 10000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.type).toBe(createDto.type);
      expect(response.body.currency).toBe(createDto.currency);
      expect(Number(response.body.initialBalance)).toBe(createDto.initialBalance);

      accountId = response.body.id;
    });

    it('debería requerir autenticación', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .send({ name: 'Test', type: 'SPOT', currency: 'USD' })
        .expect(401);
    });
  });

  describe('GET /accounts/:id', () => {
    it('debería obtener detalle con métricas', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('equity');
      expect(response.body).toHaveProperty('drawdown');
      expect(response.body).toHaveProperty('totalCashflows');
      expect(response.body).toHaveProperty('totalRealizedPnL');
      expect(typeof response.body.equity).toBe('number');
      expect(typeof response.body.drawdown).toBe('number');
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      // Crear otro usuario y cuenta
      const otherUser = await prismaService.user.create({
        data: {
          email: 'other-user@example.com',
          passwordHash: await argon2.hash('Test123!@#'),
          settings: {
            create: {
              timezone: 'America/Bogota',
              baseCurrency: 'USD',
              onboardingCompleted: true,
            },
          },
        },
      });

      const otherAccount = await prismaService.account.create({
        data: {
          userId: otherUser.id,
          name: 'Other Account',
          type: 'SPOT',
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .get(`/api/accounts/${otherAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // Limpiar
      await prismaService.account.delete({ where: { id: otherAccount.id } });
      await prismaService.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('debería actualizar cuenta', async () => {
      const updateDto = {
        name: 'Updated Account Name',
        broker: 'Updated Broker',
        notes: 'Test notes',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.broker).toBe(updateDto.broker);
      expect(response.body.notes).toBe(updateDto.notes);
    });

    it('debería validar que la cuenta pertenece al usuario', async () => {
      const otherUser = await prismaService.user.create({
        data: {
          email: 'other-user2@example.com',
          passwordHash: await argon2.hash('Test123!@#'),
          settings: {
            create: {
              timezone: 'America/Bogota',
              baseCurrency: 'USD',
              onboardingCompleted: true,
            },
          },
        },
      });

      const otherAccount = await prismaService.account.create({
        data: {
          userId: otherUser.id,
          name: 'Other Account',
          type: 'SPOT',
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/accounts/${otherAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);

      // Limpiar
      await prismaService.account.delete({ where: { id: otherAccount.id } });
      await prismaService.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /accounts/:id', () => {
    let testAccountId: string;

    beforeEach(async () => {
      // Crear cuenta de prueba para cada test
      const account = await prismaService.account.create({
        data: {
          userId,
          name: 'Test Account to Close',
          type: 'SPOT',
          currency: 'USD',
        },
      });
      testAccountId = account.id;
    });

    it('debería cerrar cuenta correctamente', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('CLOSED');
      expect(response.body.closedAt).toBeDefined();
    });

    it('debería rechazar si cuenta no pertenece al usuario', async () => {
      const otherUser = await prismaService.user.create({
        data: {
          email: 'other-user3@example.com',
          passwordHash: await argon2.hash('Test123!@#'),
          settings: {
            create: {
              timezone: 'America/Bogota',
              baseCurrency: 'USD',
              onboardingCompleted: true,
            },
          },
        },
      });

      const otherAccount = await prismaService.account.create({
        data: {
          userId: otherUser.id,
          name: 'Other Account',
          type: 'SPOT',
          currency: 'USD',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/accounts/${otherAccount.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // Limpiar
      await prismaService.account.delete({ where: { id: otherAccount.id } });
      await prismaService.user.delete({ where: { id: otherUser.id } });
    });
  });
});


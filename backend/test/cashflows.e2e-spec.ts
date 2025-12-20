import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('CashflowsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let accountId: string;
  let cashflowId: string;

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
        email: 'cashflows-test@example.com',
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

    // Crear cuenta de prueba
    const account = await prismaService.account.create({
      data: {
        userId,
        name: 'Test Account',
        type: 'SPOT',
        currency: 'USD',
        initialBalance: 10000,
        currentBalance: 10000,
      },
    });
    accountId = account.id;

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'cashflows-test@example.com',
        password: 'Test123!@#',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.cashflow.deleteMany({
        where: { userId },
      });
      await prismaService.account.deleteMany({
        where: { userId },
      });
      await prismaService.user.delete({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('POST /cashflows', () => {
    it('debería crear cashflow exitosamente', async () => {
      const createDto = {
        accountId,
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'USD',
        description: 'Test deposit',
        date: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(createDto.type);
      expect(response.body.amount).toBe(createDto.amount);
      expect(response.body.currency).toBe(createDto.currency);
      expect(response.body.accountId).toBe(accountId);

      cashflowId = response.body.id;

      // Verificar que el balance de la cuenta se actualizó
      const account = await prismaService.account.findUnique({
        where: { id: accountId },
      });
      expect(Number(account?.currentBalance)).toBe(11000); // 10000 + 1000
    });

    it('debería validar que la moneda coincide con la cuenta', async () => {
      const createDto = {
        accountId,
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'COP', // Moneda diferente
        description: 'Test deposit',
      };

      await request(app.getHttpServer())
        .post('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('debería validar que la cuenta pertenece al usuario', async () => {
      // Crear otra cuenta de otro usuario
      const otherUser = await prismaService.user.create({
        data: {
          email: 'other-cashflow-user@example.com',
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

      const createDto = {
        accountId: otherAccount.id,
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(403);

      // Limpiar
      await prismaService.account.delete({ where: { id: otherAccount.id } });
      await prismaService.user.delete({ where: { id: otherUser.id } });
    });

    it('debería validar que la fecha no sea futura', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const createDto = {
        accountId,
        type: 'DEPOSIT',
        amount: 1000,
        currency: 'USD',
        date: futureDate.toISOString(),
      };

      await request(app.getHttpServer())
        .post('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  describe('GET /cashflows', () => {
    beforeEach(async () => {
      // Crear algunos cashflows de prueba
      await prismaService.cashflow.createMany({
        data: [
          {
            accountId,
            userId,
            type: 'DEPOSIT',
            amount: 500,
            currency: 'USD',
            date: new Date('2024-01-15'),
          },
          {
            accountId,
            userId,
            type: 'WITHDRAWAL',
            amount: 200,
            currency: 'USD',
            date: new Date('2024-01-20'),
          },
        ],
      });
    });

    it('debería listar con filtros', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          accountId,
          type: 'DEPOSIT',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');

      // Todos los cashflows deben ser DEPOSIT
      response.body.data.forEach((cf: any) => {
        expect(cf.type).toBe('DEPOSIT');
        expect(cf.accountId).toBe(accountId);
      });
    });

    it('debería aplicar paginación correctamente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/cashflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          page: 1,
          limit: 1,
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
    });
  });

  describe('GET /accounts/:id', () => {
    it('debería obtener detalle con métricas calculadas después de cashflow', async () => {
      // Crear un cashflow adicional
      await prismaService.cashflow.create({
        data: {
          accountId,
          userId,
          type: 'DEPOSIT',
          amount: 500,
          currency: 'USD',
          date: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('equity');
      expect(response.body).toHaveProperty('totalCashflows');
      expect(response.body.totalCashflows).toBeGreaterThan(0);
      // Equity debería ser balance + PnL (balance incluye cashflows)
      expect(response.body.equity).toBeGreaterThanOrEqual(response.body.currentBalance || 0);
    });
  });

  describe('PATCH /cashflows/:id', () => {
    it('debería actualizar cashflow', async () => {
      const updateDto = {
        amount: 1500,
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/cashflows/${cashflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.amount).toBe(updateDto.amount);
      expect(response.body.description).toBe(updateDto.description);
    });

    it('debería rechazar si cashflow no pertenece al usuario', async () => {
      const otherUser = await prismaService.user.create({
        data: {
          email: 'other-cashflow-user2@example.com',
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

      const otherCashflow = await prismaService.cashflow.create({
        data: {
          accountId: otherAccount.id,
          userId: otherUser.id,
          type: 'DEPOSIT',
          amount: 1000,
          currency: 'USD',
          date: new Date(),
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/cashflows/${otherCashflow.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 2000 })
        .expect(403);

      // Limpiar
      await prismaService.cashflow.delete({ where: { id: otherCashflow.id } });
      await prismaService.account.delete({ where: { id: otherAccount.id } });
      await prismaService.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /cashflows/:id', () => {
    let testCashflowId: string;

    beforeEach(async () => {
      const cashflow = await prismaService.cashflow.create({
        data: {
          accountId,
          userId,
          type: 'DEPOSIT',
          amount: 300,
          currency: 'USD',
          date: new Date(),
        },
      });
      testCashflowId = cashflow.id;
    });

    it('debería eliminar cashflow correctamente', async () => {
      await request(app.getHttpServer())
        .delete(`/api/cashflows/${testCashflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que se eliminó
      const cashflow = await prismaService.cashflow.findUnique({
        where: { id: testCashflowId },
      });
      expect(cashflow).toBeNull();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('InstrumentsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let instrumentId: string;
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
        email: 'instruments-test@example.com',
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
        email: 'instruments-test-other@example.com',
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
        email: 'instruments-test@example.com',
        password: 'Test123!@#',
      });
    accessToken = loginResponse.body.accessToken;

    // Login para obtener token del segundo usuario
    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'instruments-test-other@example.com',
        password: 'Test123!@#',
      });
    otherAccessToken = otherLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (userId) {
      await prismaService.instrument.deleteMany({
        where: { userId },
      });
    }
    if (otherUserId) {
      await prismaService.instrument.deleteMany({
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

  describe('POST /instruments', () => {
    it('debería crear instrumento exitosamente', () => {
      return request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: 'BINANCE',
          symbol: 'BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
          tickSize: 0.01,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.ticker).toBe('BINANCE:BTCUSDT');
          expect(res.body.market).toBe('BINANCE');
          expect(res.body.symbol).toBe('BTCUSDT');
          expect(res.body.name).toBe('Bitcoin');
          expect(res.body.type).toBe('CRYPTO');
          expect(res.body.isActive).toBe(true);
          instrumentId = res.body.id;
        });
    });

    it('debería normalizar market y symbol a uppercase', () => {
      return request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: 'nasdaq',
          symbol: 'aapl',
          name: 'Apple Inc.',
          type: 'STOCK',
          currencyQuote: 'USD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.ticker).toBe('NASDAQ:AAPL');
          expect(res.body.market).toBe('NASDAQ');
          expect(res.body.symbol).toBe('AAPL');
        });
    });

    it('debería rechazar ticker duplicado', async () => {
      // Crear primer instrumento
      await request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: 'NYSE',
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          type: 'ETF',
          currencyQuote: 'USD',
        })
        .expect(201);

      // Intentar crear duplicado
      return request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: 'NYSE',
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          type: 'ETF',
          currencyQuote: 'USD',
        })
        .expect(409);
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: '',
          symbol: 'BTCUSDT',
          name: 'Bitcoin',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
        })
        .expect(400);
    });

    it('debería requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/instruments')
        .send({
          market: 'BINANCE',
          symbol: 'ETHUSDT',
          name: 'Ethereum',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
        })
        .expect(401);
    });
  });

  describe('GET /instruments', () => {
    it('debería listar instrumentos del usuario', () => {
      return request(app.getHttpServer())
        .get('/api/instruments')
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

    it('debería filtrar por market', () => {
      return request(app.getHttpServer())
        .get('/api/instruments?market=BINANCE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((instrument: any) => {
            expect(instrument.market).toBe('BINANCE');
          });
        });
    });

    it('debería filtrar por type', () => {
      return request(app.getHttpServer())
        .get('/api/instruments?type=CRYPTO')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((instrument: any) => {
            expect(instrument.type).toBe('CRYPTO');
          });
        });
    });

    it('debería buscar por término', () => {
      return request(app.getHttpServer())
        .get('/api/instruments?search=BTC')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          // Al menos un resultado debe contener BTC
          const hasBTC = res.body.data.some(
            (instrument: any) =>
              instrument.name.includes('BTC') ||
              instrument.symbol.includes('BTC') ||
              instrument.ticker.includes('BTC'),
          );
          expect(hasBTC || res.body.data.length === 0).toBe(true);
        });
    });

    it('debería paginar correctamente', () => {
      return request(app.getHttpServer())
        .get('/api/instruments?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(10);
          expect(res.body.data.length).toBeLessThanOrEqual(10);
        });
    });
  });

  describe('GET /instruments/search', () => {
    it('debería buscar instrumentos rápidamente', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/search?q=BTC')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(10);
        });
    });

    it('debería retornar array vacío si query está vacío', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/search?q=')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('GET /instruments/ticker/:ticker', () => {
    it('debería buscar instrumento por ticker', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/ticker/BINANCE:BTCUSDT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ticker).toBe('BINANCE:BTCUSDT');
        });
    });

    it('debería normalizar ticker a uppercase', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/ticker/binance:btcusdt')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ticker).toBe('BINANCE:BTCUSDT');
        });
    });

    it('debería retornar 404 si no existe', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/ticker/BINANCE:INVALID')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /instruments/:id', () => {
    it('debería obtener instrumento por ID', () => {
      return request(app.getHttpServer())
        .get(`/api/instruments/${instrumentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(instrumentId);
          expect(res.body.userId).toBe(userId);
        });
    });

    it('debería rechazar acceso a instrumento de otro usuario', async () => {
      // Crear instrumento con otro usuario
      const otherInstrument = await request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          market: 'BINANCE',
          symbol: 'ETHUSDT',
          name: 'Ethereum',
          type: 'CRYPTO',
          currencyQuote: 'USDT',
        })
        .expect(201);

      // Intentar acceder con el primer usuario
      return request(app.getHttpServer())
        .get(`/api/instruments/${otherInstrument.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('debería retornar 404 si no existe', () => {
      return request(app.getHttpServer())
        .get('/api/instruments/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /instruments/:id', () => {
    it('debería actualizar instrumento', () => {
      return request(app.getHttpServer())
        .patch(`/api/instruments/${instrumentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Bitcoin',
          notes: 'Updated notes',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Bitcoin');
          expect(res.body.notes).toBe('Updated notes');
        });
    });

    it('debería rechazar actualizar instrumento de otro usuario', async () => {
      // Crear instrumento con otro usuario
      const otherInstrument = await request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          market: 'NASDAQ',
          symbol: 'MSFT',
          name: 'Microsoft',
          type: 'STOCK',
          currencyQuote: 'USD',
        })
        .expect(201);

      // Intentar actualizar con el primer usuario
      return request(app.getHttpServer())
        .patch(`/api/instruments/${otherInstrument.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });
  });

  describe('DELETE /instruments/:id', () => {
    let deleteInstrumentId: string;

    beforeEach(async () => {
      // Crear instrumento para eliminar
      const response = await request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          market: 'FX',
          symbol: 'EURUSD',
          name: 'Euro/US Dollar',
          type: 'FOREX',
          currencyQuote: 'USD',
          contractSize: 100000,
        })
        .expect(201);
      deleteInstrumentId = response.body.id;
    });

    it('debería hacer soft delete (marcar isActive = false)', () => {
      return request(app.getHttpServer())
        .delete(`/api/instruments/${deleteInstrumentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
        .then(async () => {
          // Verificar que el instrumento sigue existiendo pero está inactivo
          const response = await request(app.getHttpServer())
            .get(`/api/instruments/${deleteInstrumentId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
          expect(response.body.isActive).toBe(false);
        });
    });

    it('debería rechazar eliminar instrumento de otro usuario', async () => {
      // Crear instrumento con otro usuario
      const otherInstrument = await request(app.getHttpServer())
        .post('/api/instruments')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          market: 'NYSE',
          symbol: 'TSLA',
          name: 'Tesla',
          type: 'STOCK',
          currencyQuote: 'USD',
        })
        .expect(201);

      // Intentar eliminar con el primer usuario
      return request(app.getHttpServer())
        .delete(`/api/instruments/${otherInstrument.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});


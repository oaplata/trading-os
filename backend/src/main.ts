import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security: Helmet for HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Para permitir recursos externos si es necesario
    }),
  );

  // Global validation pipe with enhanced options
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma automáticamente tipos
      transformOptions: {
        enableImplicitConversion: true, // Convierte strings a números, etc.
      },
      disableErrorMessages: configService.get<string>('NODE_ENV') === 'production', // Oculta mensajes en producción
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173';
  const corsOrigins = corsOrigin.split(',').map((origin) => origin.trim());
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc.) en desarrollo
      if (!origin && configService.get<string>('NODE_ENV') === 'development') {
        return callback(null, true);
      }
      // Verificar si el origin está en la lista permitida
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Obtener puerto antes de usarlo
  const port = configService.get<number>('PORT') || 3000;

  // Swagger/OpenAPI Documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Trading OS API')
      .setDescription('API del Trading OS - Sistema de journal, portfolio y analytics para trading')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Endpoints de autenticación')
      .addTag('users', 'Endpoints de usuarios')
      .addTag('accounts', 'Endpoints de cuentas')
      .addTag('cashflows', 'Endpoints de cashflows (depósitos, retiros, ajustes)')
      .addTag('instruments', 'Endpoints de instrumentos (catálogo multi-mercado)')
      .addTag('strategies', 'Endpoints de estrategias de trading')
      .addTag('setups', 'Endpoints de setups (patrones de trading)')
      .addTag('rules', 'Endpoints de reglas (checklist de validación)')
      .addTag('trades', 'Endpoints de trades (operaciones de trading)')
      .addTag('fills', 'Endpoints de fills (ejecuciones parciales)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  }

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);

  logger.log(`🚀 Trading OS Backend running on: http://localhost:${port}/api`);
  logger.log(`📝 Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
  logger.log(`🔒 CORS enabled for: ${corsOrigins.join(', ')}`);
}

bootstrap();


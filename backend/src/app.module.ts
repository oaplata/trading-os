import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { CashflowsModule } from './cashflows/cashflows.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { StrategiesModule } from './strategies/strategies.module';
import { SetupsModule } from './setups/setups.module';
import { RulesModule } from './rules/rules.module';
import { TradesModule } from './trades/trades.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') || 60000, // 1 minuto
          limit: configService.get<number>('THROTTLE_LIMIT') || 10, // 10 requests
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    CashflowsModule,
    InstrumentsModule,
    StrategiesModule,
    SetupsModule,
    RulesModule,
    TradesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


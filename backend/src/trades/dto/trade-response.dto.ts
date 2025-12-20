import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TradeSide, TradeType } from './create-trade.dto';
import { TradeStatus, TradeResult } from './trade-list-query.dto';

export enum TradeEmotion {
  CALM = 'CALM',
  NEUTRAL = 'NEUTRAL',
  ANXIOUS = 'ANXIOUS',
  GREEDY = 'GREEDY',
}

export class TradeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  instrumentId: string;

  @ApiPropertyOptional()
  strategyId?: string;

  @ApiPropertyOptional()
  setupId?: string;

  @ApiProperty({ enum: TradeSide })
  side: TradeSide;

  @ApiProperty({ enum: TradeType })
  type: TradeType;

  @ApiProperty({ enum: TradeStatus })
  status: TradeStatus;

  @ApiPropertyOptional()
  timeframe?: string;

  @ApiPropertyOptional()
  plannedEntry?: number;

  @ApiPropertyOptional()
  plannedStopLoss?: number;

  @ApiPropertyOptional({ type: [Number] })
  plannedTakeProfits?: number[];

  @ApiPropertyOptional()
  riskPercent?: number;

  @ApiPropertyOptional()
  riskAmount?: number;

  @ApiPropertyOptional()
  plannedSize?: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  thesis?: string;

  @ApiPropertyOptional()
  screenshotUrl?: string;

  @ApiPropertyOptional()
  openTime?: Date;

  @ApiPropertyOptional()
  closeTime?: Date;

  @ApiPropertyOptional()
  netPnL?: number;

  @ApiPropertyOptional()
  realizedPnL?: number;

  @ApiPropertyOptional()
  unrealizedPnL?: number;

  @ApiProperty()
  totalFees: number;

  @ApiPropertyOptional()
  rMultiple?: number;

  @ApiPropertyOptional({ enum: TradeResult })
  result?: TradeResult;

  @ApiPropertyOptional({ enum: TradeEmotion })
  emotion?: TradeEmotion;

  @ApiPropertyOptional()
  lessonLearned?: string;

  @ApiProperty()
  checklistCompleted: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Relaciones
  @ApiPropertyOptional()
  account?: {
    id: string;
    name: string;
    currency: string;
  };

  @ApiPropertyOptional()
  instrument?: {
    id: string;
    ticker: string;
    name: string;
    type: string;
  };

  @ApiPropertyOptional()
  strategy?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional()
  setup?: {
    id: string;
    name: string;
  };

  // Métricas calculadas
  @ApiPropertyOptional()
  openQuantity?: number;

  @ApiPropertyOptional()
  avgEntryPrice?: number;

  @ApiPropertyOptional()
  avgExitPrice?: number;

  @ApiPropertyOptional()
  breakEvenPrice?: number;
}


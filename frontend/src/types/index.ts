export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  settings?: UserSettings;
}

export interface UserSettings {
  id: string;
  userId: string;
  timezone: string;
  baseCurrency: 'COP' | 'USD';
  defaultRiskPercent?: number;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  broker?: string | null;
  type: 'SPOT' | 'MARGIN' | 'FUTURES' | 'CFD';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  initialBalance?: number | null;
  currentBalance?: number | null;
  notes?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDetail extends Account {
  equity: number;
  drawdown: number;
  monthlyReturn?: number;
  totalCashflows: number;
  totalRealizedPnL: number;
}

export interface CreateAccountDto {
  name: string;
  broker?: string;
  type: 'SPOT' | 'MARGIN' | 'FUTURES' | 'CFD';
  currency: string;
  initialBalance?: number;
  notes?: string;
}

export interface UpdateAccountDto {
  name?: string;
  broker?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  notes?: string;
}

export interface Cashflow {
  id: string;
  accountId: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'FEE';
  amount: number;
  currency: string;
  description?: string | null;
  date: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
}

export interface AccountSnapshot {
  id: string;
  accountId: string;
  date: string;
  equity: number;
  balance: number;
  realizedPnL: number;
  unrealizedPnL?: number | null;
  drawdown: number;
  createdAt: string;
}

// Módulo C - Instrumentos

export type InstrumentType = 'CRYPTO' | 'STOCK' | 'ETF' | 'FOREX' | 'FUTURES' | 'OPTIONS';

export interface Instrument {
  id: string;
  userId: string;
  market: string;
  symbol: string;
  ticker: string; // MARKET:SYMBOL
  name: string;
  type: InstrumentType;
  currencyQuote: string;
  tickSize?: number | null;
  contractSize?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstrumentDto {
  market: string;
  symbol: string;
  name: string;
  type: InstrumentType;
  currencyQuote: string;
  tickSize?: number;
  contractSize?: number;
  notes?: string;
}

export interface UpdateInstrumentDto {
  name?: string;
  type?: InstrumentType;
  currencyQuote?: string;
  tickSize?: number;
  contractSize?: number;
  isActive?: boolean;
  notes?: string;
}

export interface InstrumentListQuery {
  market?: string;
  type?: InstrumentType;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface InstrumentPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedInstruments {
  data: Instrument[];
  meta: InstrumentPaginationMeta;
}

// Módulo D - Estrategias, Setups y Reglas

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  targetMarket?: string | null;
  typicalTimeframe?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  setupCount?: number;
}

export interface CreateStrategyDto {
  name: string;
  description?: string;
  targetMarket?: string;
  typicalTimeframe?: string;
  notes?: string;
}

export interface UpdateStrategyDto {
  name?: string;
  description?: string;
  targetMarket?: string;
  typicalTimeframe?: string;
  notes?: string;
}

export interface StrategyListQuery {
  targetMarket?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedStrategies {
  data: Strategy[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Setup {
  id: string;
  userId: string;
  strategyId?: string | null;
  name: string;
  description?: string | null;
  suggestedTags?: string[];
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  ruleCount?: number;
  strategy?: Strategy;
  rules?: Rule[];
}

export interface CreateSetupDto {
  strategyId?: string;
  name: string;
  description?: string;
  suggestedTags?: string[];
  notes?: string;
}

export interface UpdateSetupDto {
  strategyId?: string;
  name?: string;
  description?: string;
  suggestedTags?: string[];
  notes?: string;
}

export interface SetupListQuery {
  strategyId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedSetups {
  data: Setup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Rule {
  id: string;
  userId: string;
  setupId: string;
  name: string;
  description?: string | null;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDto {
  setupId: string;
  name: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
}

export interface RuleListQuery {
  setupId?: string;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface ReorderRulesDto {
  setupId: string;
  ruleIds: string[];
}

// Módulo E - Operaciones (Trade Lifecycle)

export type TradeSide = 'LONG' | 'SHORT';
export type TradeType = 'SPOT' | 'MARGIN' | 'FUTURES' | 'OPTIONS';
export type TradeStatus = 'PLANNED' | 'OPEN' | 'CLOSED' | 'CANCELED';
export type FillType = 'ENTRY' | 'EXIT' | 'FEE' | 'ADJUSTMENT';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAK_EVEN';
export type TradeEmotion = 'CALM' | 'NEUTRAL' | 'ANXIOUS' | 'GREEDY';

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  instrumentId: string;
  strategyId?: string | null;
  setupId?: string | null;
  side: TradeSide;
  type: TradeType;
  status: TradeStatus;
  timeframe?: string | null;
  plannedEntry?: number | null;
  plannedStopLoss?: number | null;
  plannedTakeProfits?: number[];
  riskPercent?: number | null;
  riskAmount?: number | null;
  plannedSize?: number | null;
  tags: string[];
  thesis?: string | null;
  screenshotUrl?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  netPnL?: number | null;
  realizedPnL?: number | null;
  unrealizedPnL?: number | null;
  totalFees: number;
  rMultiple?: number | null;
  result?: TradeResult | null;
  emotion?: TradeEmotion | null;
  lessonLearned?: string | null;
  checklistCompleted: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  instrument?: {
    id: string;
    ticker: string;
    name: string;
    type: string;
  };
  strategy?: {
    id: string;
    name: string;
  };
  setup?: {
    id: string;
    name: string;
  };
  fills?: Fill[];
  checklist?: TradeChecklist[];
  // Métricas calculadas
  openQuantity?: number;
  avgEntryPrice?: number | null;
  avgExitPrice?: number | null;
  breakEvenPrice?: number | null;
  _count?: {
    fills: number;
  };
}

export interface CreateTradeDto {
  accountId: string;
  instrumentId: string;
  strategyId?: string;
  setupId?: string;
  side: TradeSide;
  type?: TradeType;
  timeframe?: string;
  plannedEntry?: number;
  plannedStopLoss: number;
  plannedTakeProfits?: number[];
  riskPercent?: number;
  riskAmount?: number;
  plannedSize?: number;
  tags?: string[];
  thesis?: string;
  screenshotUrl?: string;
}

export interface UpdateTradeDto {
  side?: TradeSide;
  type?: TradeType;
  timeframe?: string;
  strategyId?: string;
  setupId?: string;
  plannedEntry?: number;
  plannedStopLoss?: number;
  plannedTakeProfits?: number[];
  riskPercent?: number;
  riskAmount?: number;
  plannedSize?: number;
  tags?: string[];
  thesis?: string;
  screenshotUrl?: string;
  notes?: string;
}

export interface TradeListQuery {
  accountId?: string;
  instrumentId?: string;
  strategyId?: string;
  setupId?: string;
  status?: TradeStatus;
  side?: TradeSide;
  result?: TradeResult;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTrades {
  data: Trade[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CloseTradeDto {
  result: TradeResult;
  emotion?: TradeEmotion;
  lessonLearned?: string;
  checklist?: ChecklistItemDto[];
}

export interface ChecklistItemDto {
  ruleId: string;
  completed: boolean;
  notes?: string;
}

export interface Fill {
  id: string;
  tradeId: string;
  userId: string;
  type: FillType;
  quantity?: number | null;
  price?: number | null;
  fee: number;
  feeCurrency: string;
  datetime: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFillDto {
  tradeId: string;
  type: FillType;
  quantity?: number;
  price?: number;
  fee?: number;
  feeCurrency?: string;
  datetime: string;
  notes?: string;
}

export interface UpdateFillDto {
  type?: FillType;
  quantity?: number;
  price?: number;
  fee?: number;
  feeCurrency?: string;
  datetime?: string;
  notes?: string;
}

export interface TradeChecklist {
  id: string;
  tradeId: string;
  ruleId: string;
  userId: string;
  completed: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  rule?: {
    id: string;
    name: string;
    description?: string | null;
    order: number;
    isRequired: boolean;
  };
}

export interface ChecklistItem {
  ruleId: string;
  ruleName?: string;
  ruleDescription?: string | null;
  order?: number;
  isRequired?: boolean;
  completed: boolean;
  notes?: string | null;
}

export interface UpdateChecklistDto {
  checklist: ChecklistItemDto[];
}


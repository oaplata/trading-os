# Checklist - Módulo E: Operaciones (Trade Lifecycle)

## 📋 Resumen

Este módulo implementa el ciclo de vida completo de las operaciones de trading, desde la planificación hasta el cierre, incluyendo ejecuciones parciales, gestión de fees y evaluación de disciplina.

**Estado:** 🔄 En progreso (Backend y Frontend completados)

---

## 🗄️ Backend

### 1. Prisma Schema

#### 1.1 Modelo Trade

- [x] Crear modelo `Trade` en `prisma/schema.prisma`:
  - [x] `id` (UUID, PK)
  - [x] `userId` (UUID, FK a User, indexado)
  - [x] `accountId` (UUID, FK a Account, indexado)
  - [x] `instrumentId` (UUID, FK a Instrument, indexado)
  - [x] `strategyId` (UUID?, FK a Strategy, nullable, indexado)
  - [x] `setupId` (UUID?, FK a Setup, nullable, indexado)
  - [x] `side` (Enum: LONG, SHORT)
  - [x] `type` (Enum: SPOT, MARGIN, FUTURES, OPTIONS, default: SPOT)
  - [x] `status` (Enum: PLANNED, OPEN, CLOSED, CANCELED, default: PLANNED)
  - [x] `timeframe` (String?, nullable)
  - [x] `plannedEntry` (Decimal?, nullable)
  - [x] `plannedStopLoss` (Decimal?, nullable)
  - [x] `plannedTakeProfits` (Decimal[], array)
  - [x] `riskPercent` (Decimal?, nullable)
  - [x] `riskAmount` (Decimal?, nullable)
  - [x] `plannedSize` (Decimal?, nullable)
  - [x] `tags` (String[], array)
  - [x] `thesis` (String?, nullable)
  - [x] `screenshotUrl` (String?, nullable)
  - [x] `openTime` (DateTime?, nullable)
  - [x] `closeTime` (DateTime?, nullable)
  - [x] `netPnL` (Decimal?, nullable)
  - [x] `realizedPnL` (Decimal?, nullable)
  - [x] `unrealizedPnL` (Decimal?, nullable)
  - [x] `totalFees` (Decimal, default: 0)
  - [x] `rMultiple` (Decimal?, nullable)
  - [x] `result` (Enum?: WIN, LOSS, BREAK_EVEN, nullable)
  - [x] `emotion` (Enum?: CALM, NEUTRAL, ANXIOUS, GREEDY, nullable)
  - [x] `lessonLearned` (String?, nullable)
  - [x] `checklistCompleted` (Boolean, default: false)
  - [x] `notes` (String?, nullable)
  - [x] `createdAt` (DateTime, default: now)
  - [x] `updatedAt` (DateTime, updatedAt)

#### 1.2 Modelo Fill (Execution)

- [x] Crear modelo `Fill` en `prisma/schema.prisma`:
  - [x] `id` (UUID, PK)
  - [x] `tradeId` (UUID, FK a Trade, indexado)
  - [x] `userId` (UUID, FK a User, indexado)
  - [x] `type` (Enum: ENTRY, EXIT, FEE, ADJUSTMENT)
  - [x] `quantity` (Decimal, nullable para FEE/ADJUSTMENT)
  - [x] `price` (Decimal, nullable para FEE/ADJUSTMENT)
  - [x] `fee` (Decimal, default: 0)
  - [x] `feeCurrency` (String, default: misma que instrumento)
  - [x] `datetime` (DateTime)
  - [x] `notes` (String?, nullable)
  - [x] `createdAt` (DateTime, default: now)
  - [x] `updatedAt` (DateTime, updatedAt)

#### 1.3 Modelo TradeChecklist

- [x] Crear modelo `TradeChecklist` en `prisma/schema.prisma`:
  - [x] `id` (UUID, PK)
  - [x] `tradeId` (UUID, FK a Trade, indexado)
  - [x] `ruleId` (UUID, FK a Rule, indexado)
  - [x] `userId` (UUID, FK a User, indexado)
  - [x] `completed` (Boolean, default: false)
  - [x] `notes` (String?, nullable)
  - [x] `createdAt` (DateTime, default: now)
  - [x] `updatedAt` (DateTime, updatedAt)

#### 1.4 Enums

- [x] Crear enum `TradeSide`:
  - [x] `LONG`
  - [x] `SHORT`
- [x] Crear enum `TradeType`:
  - [x] `SPOT`
  - [x] `MARGIN`
  - [x] `FUTURES`
  - [x] `OPTIONS`
- [x] Crear enum `TradeStatus`:
  - [x] `PLANNED`
  - [x] `OPEN`
  - [x] `CLOSED`
  - [x] `CANCELED`
- [x] Crear enum `FillType`:
  - [x] `ENTRY`
  - [x] `EXIT`
  - [x] `FEE`
  - [x] `ADJUSTMENT`
- [x] Crear enum `TradeResult`:
  - [x] `WIN`
  - [x] `LOSS`
  - [x] `BREAK_EVEN`
- [x] Crear enum `TradeEmotion`:
  - [x] `CALM`
  - [x] `NEUTRAL`
  - [x] `ANXIOUS`
  - [x] `GREEDY`

#### 1.5 Relaciones

- [x] `Trade.user` → User (N:1, onDelete: Cascade)
- [x] `Trade.account` → Account (N:1, onDelete: Restrict)
- [x] `Trade.instrument` → Instrument (N:1, onDelete: Restrict)
- [x] `Trade.strategy` → Strategy (N:1, onDelete: SetNull)
- [x] `Trade.setup` → Setup (N:1, onDelete: SetNull)
- [x] `Trade.fills` → Fill[] (1:N, onDelete: Cascade)
- [x] `Trade.checklist` → TradeChecklist[] (1:N, onDelete: Cascade)
- [x] `Fill.trade` → Trade (N:1, onDelete: Cascade)
- [x] `Fill.user` → User (N:1, onDelete: Cascade)
- [x] `TradeChecklist.trade` → Trade (N:1, onDelete: Cascade)
- [x] `TradeChecklist.rule` → Rule (N:1, onDelete: Restrict)
- [x] `TradeChecklist.user` → User (N:1, onDelete: Cascade)

#### 1.6 Índices

- [x] `Trade.userId` (indexado)
- [x] `Trade.accountId` (indexado)
- [x] `Trade.instrumentId` (indexado)
- [x] `Trade.strategyId` (indexado)
- [x] `Trade.setupId` (indexado)
- [x] `Trade.status` (indexado)
- [x] `Trade.openTime` (indexado)
- [x] `Trade.closeTime` (indexado)
- [x] `Trade.userId, status` (compuesto)
- [x] `Trade.userId, accountId` (compuesto)
- [x] `Trade.userId, strategyId` (compuesto)
- [x] `Fill.tradeId` (indexado)
- [x] `Fill.userId` (indexado)
- [x] `Fill.datetime` (indexado)
- [x] `Fill.tradeId, datetime` (compuesto)
- [x] `TradeChecklist.tradeId` (indexado)
- [x] `TradeChecklist.ruleId` (indexado)
- [x] `TradeChecklist.userId` (indexado)
- [x] `TradeChecklist.tradeId, ruleId` (único, compuesto)

### 2. DTOs

#### 2.1 Trade DTOs

- [x] Crear `dto/create-trade.dto.ts`:

  - [x] `accountId` (UUID, requerido)
  - [x] `instrumentId` (UUID, requerido)
  - [x] `strategyId` (UUID?, opcional)
  - [x] `setupId` (UUID?, opcional)
  - [x] `side` (TradeSide, requerido)
  - [x] `type` (TradeType, default: SPOT)
  - [x] `timeframe` (String?, opcional)
  - [x] `plannedEntry` (Decimal?, opcional)
  - [x] `plannedStopLoss` (Decimal, requerido)
  - [x] `plannedTakeProfits` (Decimal[], array)
  - [x] `riskPercent` (Decimal?, opcional)
  - [x] `riskAmount` (Decimal?, opcional)
  - [x] `plannedSize` (Decimal?, opcional)
  - [x] `tags` (String[], array)
  - [x] `thesis` (String?, opcional)
  - [x] `screenshotUrl` (String?, opcional)
  - [x] Validaciones: al menos uno de riskPercent o riskAmount

- [x] Crear `dto/update-trade.dto.ts`:

  - [x] Todos los campos opcionales
  - [x] Validaciones según estado del trade

- [x] Crear `dto/trade-response.dto.ts`:

  - [x] Todos los campos del modelo
  - [x] `account` (Account básico)
  - [x] `instrument` (Instrument básico)
  - [x] `strategy` (Strategy básico, nullable)
  - [x] `setup` (Setup básico, nullable)
  - [x] `fills` (Fill[], opcional)
  - [x] `checklist` (TradeChecklist[], opcional)
  - [x] `openQuantity` (Decimal, calculado)
  - [x] `avgEntryPrice` (Decimal?, calculado)
  - [x] `avgExitPrice` (Decimal?, calculado)
  - [x] `breakEvenPrice` (Decimal?, calculado)

- [x] Crear `dto/trade-list-query.dto.ts`:

  - [x] `accountId` (UUID?, opcional)
  - [x] `instrumentId` (UUID?, opcional)
  - [x] `strategyId` (UUID?, opcional)
  - [x] `setupId` (UUID?, opcional)
  - [x] `status` (TradeStatus?, opcional)
  - [x] `side` (TradeSide?, opcional)
  - [x] `result` (TradeResult?, opcional)
  - [x] `tags` (String[], opcional)
  - [x] `dateFrom` (Date?, opcional)
  - [x] `dateTo` (Date?, opcional)
  - [x] `search` (String?, opcional)
  - [x] `page` (number, default: 1)
  - [x] `limit` (number, default: 50)

- [x] Crear `dto/open-trade.dto.ts`:

  - [x] `tradeId` (UUID, requerido)
  - [x] Validar que el trade esté en estado PLANNED

- [x] Crear `dto/close-trade.dto.ts`:
  - [x] `tradeId` (UUID, requerido)
  - [x] `result` (TradeResult, requerido)
  - [x] `emotion` (TradeEmotion?, opcional)
  - [x] `lessonLearned` (String?, opcional)
  - [x] `checklist` (Array<{ruleId: UUID, completed: boolean}>, opcional)
  - [x] Validar que openQuantity = 0

#### 2.2 Fill DTOs

- [x] Crear `dto/create-fill.dto.ts`:

  - [x] `tradeId` (UUID, requerido)
  - [x] `type` (FillType, requerido)
  - [x] `quantity` (Decimal?, opcional, requerido para ENTRY/EXIT)
  - [x] `price` (Decimal?, opcional, requerido para ENTRY/EXIT)
  - [x] `fee` (Decimal, default: 0)
  - [x] `feeCurrency` (String?, opcional)
  - [x] `datetime` (DateTime, requerido)
  - [x] `notes` (String?, opcional)
  - [x] Validaciones según tipo de fill

- [x] Crear `dto/update-fill.dto.ts`:

  - [x] Todos los campos opcionales
  - [x] Validaciones según tipo de fill

- [x] Crear `dto/fill-response.dto.ts`:
  - [x] Todos los campos del modelo

#### 2.3 TradeChecklist DTOs

- [x] Crear `dto/update-checklist.dto.ts`:
  - [x] `tradeId` (UUID, requerido)
  - [x] `checklist` (Array<{ruleId: UUID, completed: boolean, notes?: string}>, requerido)

### 3. Services

#### 3.1 TradesService

- [x] Crear `trades.service.ts`:
  - [x] `create(userId, dto)`: Crear trade planificado
    - [x] Validar accountId pertenece al usuario
    - [x] Validar instrumentId existe
    - [x] Validar strategyId y setupId si se proporcionan
    - [x] Calcular plannedSize si se proporciona riskPercent o riskAmount
    - [x] Estado inicial: PLANNED
  - [x] `findAll(userId, query)`: Listar trades con filtros y paginación
    - [x] Filtrar por usuario
    - [x] Aplicar filtros de query
    - [x] Búsqueda en thesis, notes, tags
    - [x] Ordenar por openTime desc, createdAt desc
    - [x] Incluir relaciones básicas
  - [x] `findOne(id, userId)`: Obtener trade por ID
    - [x] Incluir todas las relaciones
    - [x] Calcular métricas (openQuantity, avgEntryPrice, etc.)
  - [x] `update(id, userId, dto)`: Actualizar trade
    - [x] Validar propiedad
    - [x] Validar estado (no se puede editar si está CLOSED)
    - [x] Actualizar campos permitidos según estado
  - [x] `openTrade(id, userId)`: Abrir trade (PLANNED → OPEN)
    - [x] Validar estado PLANNED
    - [x] Establecer openTime
    - [x] Cambiar status a OPEN
  - [x] `closeTrade(id, userId, dto)`: Cerrar trade
    - [x] Validar openQuantity = 0
    - [x] Calcular netPnL, realizedPnL, rMultiple
    - [x] Establecer closeTime
    - [x] Cambiar status a CLOSED
    - [x] Guardar checklist, result, emotion, lessonLearned
  - [x] `cancelTrade(id, userId)`: Cancelar trade (PLANNED → CANCELED)
    - [x] Validar estado PLANNED
    - [x] Cambiar status a CANCELED
  - [x] `duplicateTrade(id, userId)`: Duplicar trade
    - [x] Crear copia en estado PLANNED
    - [x] No copiar fills ni checklist
  - [x] `calculateMetrics(trade)`: Calcular métricas del trade
    - [x] openQuantity: sum(entry fills) - sum(exit fills)
    - [x] avgEntryPrice: weighted average de entry fills
    - [x] avgExitPrice: weighted average de exit fills
    - [x] breakEvenPrice: (avgEntryPrice \* quantity + totalFees) / quantity
    - [x] realizedPnL: sum(PnL de exit fills)
    - [x] unrealizedPnL: (currentPrice - avgEntryPrice) \* openQuantity (opcional)
    - [x] netPnL: realizedPnL - totalFees
    - [x] rMultiple: netPnL / riskAmount (si existe)

#### 3.2 FillsService

- [x] Crear `fills.service.ts`:
  - [x] `create(userId, dto)`: Crear fill
    - [x] Validar tradeId pertenece al usuario
    - [x] Validar trade está OPEN (para ENTRY/EXIT)
    - [x] Validar quantity y price según tipo
    - [x] Actualizar totalFees del trade
    - [x] Recalcular métricas del trade
  - [x] `findAllByTrade(tradeId, userId)`: Listar fills de un trade
    - [x] Ordenar por datetime asc
  - [x] `findOne(id, userId)`: Obtener fill por ID
  - [x] `update(id, userId, dto)`: Actualizar fill
    - [x] Validar propiedad
    - [x] Recalcular métricas del trade
  - [x] `delete(id, userId)`: Eliminar fill
    - [x] Validar propiedad
    - [x] Recalcular métricas del trade

#### 3.3 TradeChecklistService

- [x] Crear `trade-checklist.service.ts`:
  - [x] `updateChecklist(tradeId, userId, dto)`: Actualizar checklist
    - [x] Validar trade pertenece al usuario
    - [x] Obtener reglas del setup asociado
    - [x] Crear/actualizar TradeChecklist para cada regla
    - [x] Marcar checklistCompleted si todas las reglas requeridas están completas
  - [x] `getChecklist(tradeId, userId)`: Obtener checklist

### 4. Controllers

#### 4.1 TradesController

- [x] Crear `trades.controller.ts`:
  - [x] `POST /trades`: Crear trade planificado
  - [x] `GET /trades`: Listar trades con filtros
  - [x] `GET /trades/:id`: Obtener trade por ID
  - [x] `PATCH /trades/:id`: Actualizar trade
  - [x] `POST /trades/:id/open`: Abrir trade
  - [x] `POST /trades/:id/close`: Cerrar trade
  - [x] `POST /trades/:id/cancel`: Cancelar trade
  - [x] `POST /trades/:id/duplicate`: Duplicar trade
  - [x] Todos protegidos con JwtAuthGuard
  - [x] Documentación Swagger completa

#### 4.2 FillsController

- [x] Crear `fills.controller.ts`:
  - [x] `POST /fills`: Crear fill
  - [x] `GET /fills/trade/:tradeId`: Listar fills de un trade
  - [x] `GET /fills/:id`: Obtener fill por ID
  - [x] `PATCH /fills/:id`: Actualizar fill
  - [x] `DELETE /fills/:id`: Eliminar fill
  - [x] Todos protegidos con JwtAuthGuard
  - [x] Documentación Swagger completa

#### 4.3 TradeChecklistController

- [x] Crear `trade-checklist.controller.ts`:
  - [x] `PATCH /trades/:id/checklist`: Actualizar checklist
  - [x] `GET /trades/:id/checklist`: Obtener checklist
  - [x] Todos protegidos con JwtAuthGuard
  - [x] Documentación Swagger completa

### 5. Modules

- [x] Crear `trades.module.ts`:

  - [x] Importar PrismaModule
  - [x] Providers: TradesService, FillsService, TradeChecklistService
  - [x] Controllers: TradesController, FillsController, TradeChecklistController
  - [x] Exportar TradesService

- [x] Actualizar `app.module.ts`:

  - [x] Importar TradesModule

- [x] Actualizar `main.ts`:
  - [x] Agregar tag 'trades' a Swagger
  - [x] Agregar tag 'fills' a Swagger

### 6. Migración

- [x] Ejecutar `npm run prisma:migrate dev --name add_module_e_trades`
- [x] Verificar índices y relaciones en base de datos
  - [x] ✅ 3 tablas creadas (trades, fills, trade_checklist)
  - [x] ✅ 12 índices en trades (incluyendo compuestos)
  - [x] ✅ 5 índices en fills (incluyendo compuesto trade_id + datetime)
  - [x] ✅ 5 índices en trade_checklist (incluyendo constraint único trade_id + rule_id)
  - [x] ✅ 10 Foreign Keys con reglas correctas:
    - ON DELETE CASCADE: user, trade, fills
    - ON DELETE RESTRICT: account, instrument, rule
    - ON DELETE SET NULL: strategy, setup

---

## 🎨 Frontend

### 7. Types TypeScript

- [x] Actualizar `src/types/index.ts`:
  - [x] Agregar enum `TradeSide`: LONG, SHORT
  - [x] Agregar enum `TradeType`: SPOT, MARGIN, FUTURES, OPTIONS
  - [x] Agregar enum `TradeStatus`: PLANNED, OPEN, CLOSED, CANCELED
  - [x] Agregar enum `FillType`: ENTRY, EXIT, FEE, ADJUSTMENT
  - [x] Agregar enum `TradeResult`: WIN, LOSS, BREAK_EVEN
  - [x] Agregar enum `TradeEmotion`: CALM, NEUTRAL, ANXIOUS, GREEDY
  - [x] Agregar interface `Trade` con todos los campos
  - [x] Agregar interface `Fill` con todos los campos
  - [x] Agregar interface `TradeChecklist` con todos los campos
  - [x] Agregar DTOs: `CreateTradeDto`, `UpdateTradeDto`, `TradeListQuery`, etc.
  - [x] Agregar DTOs: `CreateFillDto`, `UpdateFillDto`
  - [x] Agregar DTOs: `UpdateChecklistDto`, `CloseTradeDto`

### 8. Stores Pinia

#### 8.1 Trades Store

- [x] Crear `src/stores/trades.ts`:
  - [x] State:
    - [x] `trades` (array)
    - [x] `selectedTrade` (Trade | null)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
    - [x] `filters` (TradeListQuery)
    - [x] `pagination` (meta)
  - [x] Getters:
    - [x] `openTrades` (filtrar por status OPEN)
    - [x] `closedTrades` (filtrar por status CLOSED)
    - [x] `plannedTrades` (filtrar por status PLANNED)
    - [x] `tradesByAccount` (agrupar por accountId)
    - [x] `tradesByStrategy` (agrupar por strategyId)
  - [x] Actions:
    - [x] `fetchTrades(query?)`
    - [x] `fetchTrade(id)`
    - [x] `createTrade(dto)`
    - [x] `updateTrade(id, dto)`
    - [x] `openTrade(id)`
    - [x] `closeTrade(id, dto)`
    - [x] `cancelTrade(id)`
    - [x] `duplicateTrade(id)`

#### 8.2 Fills Store

- [x] Crear `src/stores/fills.ts`:
  - [x] State:
    - [x] `fills` (array)
    - [x] `selectedFill` (Fill | null)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
  - [x] Actions:
    - [x] `fetchFillsByTrade(tradeId)`
    - [x] `createFill(dto)`
    - [x] `updateFill(id, dto)`
    - [x] `deleteFill(id)`

#### 8.3 TradeChecklist Store

- [x] Crear `src/stores/trade-checklist.ts`:
  - [x] State:
    - [x] `checklist` (array)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
  - [x] Actions:
    - [x] `fetchChecklist(tradeId)`
    - [x] `updateChecklist(tradeId, dto)`

### 9. Vistas (Views)

#### 9.1 Trades List

- [x] Crear `src/views/TradesListView.vue`:
  - [x] Tabla de trades con columnas:
    - [x] openTime, closeTime
    - [x] Instrument (ticker)
    - [x] Side (LONG/SHORT badge)
    - [x] Status (badge)
    - [x] netPnL (con color según ganancia/pérdida)
    - [x] rMultiple
    - [x] totalFees
    - [x] #fills (contador)
    - [x] checklistCompleted (badge)
    - [x] Acciones (ver, editar, duplicar, cerrar)
  - [x] Filtros:
    - [x] Account (select)
    - [x] Strategy (select)
    - [x] Status (select)
    - [x] Side (select)
    - [x] Result (select)
    - [x] Date range (dateFrom)
    - [x] Búsqueda (search)
  - [x] Paginación
  - [x] Acciones rápidas:
    - [x] Duplicar trade
    - [x] Cerrar trade (si está OPEN)
    - [x] Abrir trade (si está PLANNED)

#### 9.2 Trade Form (Plan)

- [x] Crear `src/views/TradeFormView.vue`:
  - [x] Modo creación/edición
  - [x] Campos:
    - [x] Account (select, requerido)
    - [x] Instrument (select, requerido)
    - [x] Side (radio: LONG/SHORT, requerido)
    - [x] Type (select: SPOT/MARGIN/FUTURES/OPTIONS, default: SPOT)
    - [x] Timeframe (input, opcional)
    - [x] Strategy (select, opcional)
    - [x] Setup (select, opcional, filtrado por strategy)
    - [x] Planned Entry (number, opcional)
    - [x] Planned Stop Loss (number, requerido)
    - [x] Planned Take Profits (array de números, agregar/eliminar)
    - [x] Risk: % o $ (radio, requerido)
    - [x] Risk Amount/Percent (number según selección)
    - [x] Planned Size (number, opcional)
    - [x] Tags (input con chips, array)
    - [x] Thesis (textarea, opcional)
    - [x] Screenshot URL (input, opcional)
  - [x] Validaciones:
    - [x] Al menos uno de riskPercent o riskAmount
    - [x] Planned SL requerido
    - [x] Account e Instrument requeridos
  - [x] Botón "Abrir Trade" (si está en PLANNED)
  - [x] Botón "Guardar Plan"

#### 9.3 Trade Detail

- [x] Crear `src/views/TradeDetailView.vue`:
  - [x] Sección Resumen:
    - [x] Símbolo, side, status, duración
    - [x] PnL neto, R, fees
    - [x] Avg entry/exit
    - [x] Break-even price
    - [x] Qty abierta
  - [x] Sección Plan:
    - [x] Mostrar campos del plan
    - [x] Botón editar (si no está CLOSED)
  - [x] Sección Fills Timeline:
    - [x] Tabla de fills ordenados por datetime
    - [x] Columnas: tipo, quantity, price, fee, datetime, acciones
    - [x] Botón "Agregar Fill"
    - [x] Acciones: eliminar
  - [x] Sección Checklist (si está CLOSED):
    - [x] Lista de reglas del setup
    - [x] Checkboxes para marcar cumplimiento
  - [x] Sección Post-trade Review (si está CLOSED):
    - [x] Result (WIN/LOSS/BREAK_EVEN)
    - [x] Emotion (CALM/NEUTRAL/ANXIOUS/GREEDY)
    - [x] Lesson Learned (textarea)
  - [x] Acciones:
    - [x] Abrir trade (si está PLANNED)
    - [x] Cerrar trade (si está OPEN)
    - [x] Editar trade

#### 9.4 Fill Form (Modal)

- [x] Crear `src/components/trades/FillFormModal.vue`:
  - [x] Tipo de fill (select: ENTRY/EXIT/FEE/ADJUSTMENT)
  - [x] Quantity (number, requerido para ENTRY/EXIT)
  - [x] Price (number, requerido para ENTRY/EXIT)
  - [x] Fee (number, default: 0)
  - [x] Fee Currency (input, default: USD)
  - [x] Datetime (datetime picker, default: now)
  - [x] Notes (textarea, opcional)
  - [x] Validaciones según tipo

#### 9.5 Close Trade Modal

- [x] Crear `src/components/trades/CloseTradeModal.vue`:
  - [x] Confirmación: qty abierta = 0
  - [x] Checklist de reglas (checkboxes)
  - [x] Result (radio: WIN/LOSS/BREAK_EVEN)
  - [x] Emotion (select: CALM/NEUTRAL/ANXIOUS/GREEDY, opcional)
  - [x] Lesson Learned (textarea, opcional)
  - [x] Validaciones
  - [x] Botón "Cerrar Trade"

### 10. Rutas

- [x] Actualizar `src/router/index.ts`:
  - [x] Ruta `/trades` → TradesListView
  - [x] Ruta `/trades/new` → TradeFormView
  - [x] Ruta `/trades/:id` → TradeDetailView
  - [x] Ruta `/trades/:id/edit` → TradeFormView
  - [x] Todas protegidas con `requiresAuth` y `requiresOnboarding`

### 11. Navegación

- [x] Actualizar `src/components/layout/AppLayout.vue`:
  - [x] Agregar link "Trades" en navbar
- [x] Actualizar `src/views/DashboardView.vue`:
  - [x] Agregar card de acceso rápido a Trades

---

## 🧪 Tests

### 12. Tests Backend

#### 12.1 Unit Tests — TradesService

- [ ] Crear `backend/src/trades/trades.service.spec.ts`:
  - [ ] Test `create`: Crear trade planificado
  - [ ] Test `create`: Validar accountId e instrumentId
  - [ ] Test `create`: Calcular plannedSize desde risk
  - [ ] Test `findAll`: Listar con filtros
  - [ ] Test `findAll`: Paginación
  - [ ] Test `findAll`: Búsqueda
  - [ ] Test `findOne`: Obtener por ID con métricas
  - [ ] Test `update`: Actualizar trade
  - [ ] Test `update`: Validar estado (no editar si CLOSED)
  - [ ] Test `openTrade`: Cambiar PLANNED → OPEN
  - [ ] Test `closeTrade`: Cerrar trade y calcular métricas
  - [ ] Test `closeTrade`: Validar openQuantity = 0
  - [ ] Test `cancelTrade`: Cambiar PLANNED → CANCELED
  - [ ] Test `duplicateTrade`: Duplicar trade
  - [ ] Test `calculateMetrics`: Calcular openQuantity, avgEntryPrice, etc.

#### 12.2 Unit Tests — FillsService

- [ ] Crear `backend/src/trades/fills.service.spec.ts`:
  - [ ] Test `create`: Crear fill ENTRY
  - [ ] Test `create`: Crear fill EXIT
  - [ ] Test `create`: Crear fill FEE
  - [ ] Test `create`: Validar trade está OPEN
  - [ ] Test `update`: Actualizar fill
  - [ ] Test `delete`: Eliminar fill
  - [ ] Test recalcular métricas del trade

#### 12.3 Integration Tests — Controllers

- [ ] Crear `backend/test/trades.e2e-spec.ts`:
  - [ ] Test `POST /trades`: Crear trade
  - [ ] Test `GET /trades`: Listar trades
  - [ ] Test `GET /trades/:id`: Obtener trade
  - [ ] Test `POST /trades/:id/open`: Abrir trade
  - [ ] Test `POST /trades/:id/close`: Cerrar trade
  - [ ] Test `POST /trades/:id/cancel`: Cancelar trade
  - [ ] Test `POST /trades/:id/duplicate`: Duplicar trade
  - [ ] Test acceso denegado
- [ ] Crear `backend/test/fills.e2e-spec.ts`:
  - [ ] Test `POST /fills`: Crear fill
  - [ ] Test `GET /fills/trade/:tradeId`: Listar fills
  - [ ] Test `PATCH /fills/:id`: Actualizar fill
  - [ ] Test `DELETE /fills/:id`: Eliminar fill

### 13. Tests Frontend

#### 13.1 Unit Tests — Stores

- [ ] Crear `frontend/src/stores/__tests__/trades.spec.ts`:
  - [ ] Test de store: fetchTrades
  - [ ] Test de store: createTrade
  - [ ] Test de store: openTrade
  - [ ] Test de store: closeTrade
  - [ ] Test de getters
- [ ] Crear `frontend/src/stores/__tests__/fills.spec.ts`:
  - [ ] Test de store: fetchFillsByTrade
  - [ ] Test de store: createFill
  - [ ] Test de store: updateFill

#### 13.2 Unit Tests — Components

- [ ] Crear `frontend/src/views/__tests__/TradesListView.spec.ts`:
  - [ ] Renderizar lista
  - [ ] Aplicar filtros
  - [ ] Paginación
- [ ] Crear `frontend/src/views/__tests__/TradeFormView.spec.ts`:
  - [ ] Validar formulario
  - [ ] Crear trade
  - [ ] Calcular plannedSize
- [ ] Crear `frontend/src/views/__tests__/TradeDetailView.spec.ts`:
  - [ ] Mostrar detalles
  - [ ] Agregar fill
  - [ ] Cerrar trade

---

## 📚 Documentación

### 14. Documentación técnica

- [ ] Documentar endpoints de API en Swagger:
  - [ ] Endpoints de trades
  - [ ] Endpoints de fills
  - [ ] Endpoints de checklist
  - [ ] Ejemplos de uso
- [ ] Actualizar `docs/DATABASE.md` con modelos Trade, Fill, TradeChecklist
- [ ] Documentar reglas de negocio en README
- [ ] Crear `docs/TRADES.md` con:
  - [ ] Concepto de trades, fills y checklist
  - [ ] Ciclo de vida del trade
  - [ ] Cálculo de métricas
  - [ ] Casos de uso (escalado, parciales, fees)
  - [ ] Ejemplos de trades comunes
  - [ ] Mejores prácticas

---

## ✅ Checklist de Validación Final

- [ ] Todos los endpoints funcionan correctamente
- [ ] Validaciones de negocio implementadas
- [ ] Multi-tenant funcionando
- [ ] Estados del trade funcionando (PLANNED → OPEN → CLOSED)
- [ ] Cálculo de métricas correcto
- [ ] Fills timeline funcionando
- [ ] Checklist funcionando
- [ ] Escalado de entradas funcionando
- [ ] Salidas parciales funcionando
- [ ] Fees y ajustes funcionando
- [ ] Tests pasando (backend y frontend)
- [ ] Documentación completa
- [ ] Swagger actualizado

---

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **Estados del Trade**: PLANNED → OPEN → CLOSED/CANCELED
2. **Fills**: Permiten entradas y salidas parciales, fees y ajustes
3. **Checklist**: Se evalúa al cerrar el trade, basado en las reglas del setup
4. **Métricas Calculadas**: openQuantity, avgEntryPrice, breakEvenPrice, rMultiple
5. **Risk Management**: Se puede especificar risk como % o $, se calcula plannedSize
6. **Multi-tenant**: Todos los datos están aislados por usuario

### Casos de Uso Especiales

1. **Escalado de Entrada**: Múltiples fills ENTRY con diferentes precios
2. **Salidas Parciales**: Múltiples fills EXIT (TP1, TP2, trailing, cierre final)
3. **Fees Diarios**: Fills tipo FEE para funding en futures
4. **Ajustes**: Fills tipo ADJUSTMENT para swaps en forex
5. **Trade Cancelado**: PLANNED → CANCELED sin ejecutar
6. **Duplicar Trade**: Crear copia para reutilizar plan

### Integración Futura

- Este módulo se integrará con:
  - **Módulo F (Analytics)**: Análisis de performance por estrategia/setup
  - **Módulo G (Reports)**: Reportes de trades y métricas
  - **Integración con Exchanges**: Sincronización automática de fills (futuro)

---

**Progreso:**

- ✅ Backend completado (100%)
- ✅ Frontend completado (100%)
- ⏳ Tests pendientes (0%)
- ⏳ Documentación pendiente (0%)

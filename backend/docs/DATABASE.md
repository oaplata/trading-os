# Documentación de Base de Datos - Trading OS

## Resumen

La base de datos utiliza **PostgreSQL** como motor y **Prisma** como ORM. El schema está definido en `prisma/schema.prisma`.

## Modelos de Datos

### User

Tabla principal de usuarios del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `email` | String | Email del usuario (único, indexado) |
| `passwordHash` | String | Hash de la contraseña (Argon2) |
| `emailVerified` | Boolean | Si el email está verificado (default: false) |
| `twoFactorEnabled` | Boolean | Si 2FA está habilitado (default: false) |
| `twoFactorSecret` | String? | Secreto para 2FA (nullable, preparado para futuro) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |
| `deletedAt` | DateTime? | Soft delete (nullable) |

**Relaciones:**
- `settings` → UserSettings (1:1)
- `refreshTokens` → RefreshToken (1:N)
- `passwordResets` → PasswordResetToken (1:N)
- `accounts` → Account (1:N)

### UserSettings

Configuración del usuario (timezone, moneda, defaults).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User (único) |
| `timezone` | String | Zona horaria (default: "America/Bogota") |
| `baseCurrency` | Enum | Moneda base: COP o USD (default: USD) |
| `defaultRiskPercent` | Decimal? | Riesgo % por defecto (nullable, ej: 1.0) |
| `onboardingCompleted` | Boolean | Si completó onboarding (default: false) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)

### RefreshToken

Tokens de refresh para rotación de JWT.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User |
| `token` | String | Token de refresh (único, indexado) |
| `expiresAt` | DateTime | Fecha de expiración |
| `revoked` | Boolean | Si está revocado (default: false) |
| `createdAt` | DateTime | Fecha de creación |
| `ipAddress` | String? | IP del cliente (nullable, auditoría) |
| `userAgent` | String? | User agent (nullable, auditoría) |

**Índices:**
- `userId` (indexado)
- `token` (único, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)

### PasswordResetToken

Tokens para recuperación de contraseña.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User |
| `token` | String | Token de reset (único, indexado) |
| `expiresAt` | DateTime | Fecha de expiración (típicamente 1 hora) |
| `used` | Boolean | Si ya fue usado (default: false) |
| `createdAt` | DateTime | Fecha de creación |

**Índices:**
- `userId` (indexado)
- `token` (único, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)

### Account

Cuentas de trading (brokers, exchanges).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User |
| `name` | String | Nombre de la cuenta (ej: "Binance Futures") |
| `broker` | String? | Broker/Exchange (nullable) |
| `type` | Enum | Tipo: SPOT, MARGIN, FUTURES, CFD (default: SPOT) |
| `currency` | String | Moneda de la cuenta (ej: "USD") |
| `status` | Enum | Estado: ACTIVE, INACTIVE, CLOSED (default: ACTIVE) |
| `initialBalance` | Decimal? | Balance inicial de la cuenta (nullable) |
| `currentBalance` | Decimal? | Balance actual calculado (nullable) |
| `notes` | String? | Notas adicionales sobre la cuenta (nullable) |
| `closedAt` | DateTime? | Fecha de cierre si está cerrada (nullable) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Índices:**
- `userId` (indexado)
- `status` (indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `cashflows` → Cashflow (1:N, onDelete: Cascade)
- `snapshots` → AccountSnapshot (1:N, onDelete: Cascade)

**Notas:**
- El `currentBalance` se calcula automáticamente: `initialBalance + sum(cashflows)`
- Los cashflows afectan el balance: DEPOSIT y ADJUSTMENT suman, WITHDRAWAL y FEE restan
- El `status` CLOSED se establece cuando se cierra una cuenta (soft delete)

### Instrument

Catálogo de instrumentos de trading (multi-mercado).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User (multi-tenant) |
| `market` | String | Mercado del instrumento (ej: "BINANCE", "NASDAQ", "NYSE", "FX") |
| `symbol` | String | Símbolo del instrumento (ej: "BTCUSDT", "AAPL", "SPY", "EURUSD") |
| `ticker` | String | Ticker normalizado en formato `MARKET:SYMBOL` (único por usuario) |
| `name` | String | Nombre completo del instrumento |
| `type` | Enum | Tipo: CRYPTO, STOCK, ETF, FOREX, FUTURES, OPTIONS (default: CRYPTO) |
| `currencyQuote` | String | Moneda de cotización (ej: "USD", "USDT", "EUR") |
| `tickSize` | Decimal? | Tamaño mínimo de movimiento de precio (nullable) |
| `contractSize` | Decimal? | Tamaño de contrato para forex/futures (nullable) |
| `isActive` | Boolean | Si el instrumento está activo (default: true, para soft delete) |
| `notes` | String? | Notas adicionales (nullable) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Índices:**
- `userId` (indexado)
- `market` (indexado)
- `symbol` (indexado)
- `type` (indexado)
- `isActive` (indexado)
- `userId, ticker` (único, indexado)
- `userId, market` (compuesto, indexado)
- `userId, type` (compuesto, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)

**Notas:**
- El `ticker` se genera automáticamente: `MARKET:SYMBOL` (uppercase)
- El `ticker` debe ser único por usuario (permite mismo ticker para diferentes usuarios)
- `market` y `symbol` se normalizan a uppercase automáticamente
- Soft delete: no se elimina físicamente, solo se marca `isActive = false`
- `contractSize` es altamente recomendado para FOREX y FUTURES

### Strategy

Estrategias de trading de alto nivel.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User (multi-tenant) |
| `name` | String | Nombre de la estrategia |
| `description` | String? | Descripción detallada (nullable) |
| `targetMarket` | String? | Mercado objetivo (nullable, ej: "CRYPTO", "STOCKS", "FOREX") |
| `typicalTimeframe` | String? | Timeframe típico (nullable, ej: "4H", "1D", "1W") |
| `isActive` | Boolean | Si la estrategia está activa (default: true, para soft delete) |
| `notes` | String? | Notas adicionales (nullable) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Índices:**
- `userId` (indexado)
- `targetMarket` (indexado)
- `isActive` (indexado)
- `userId, targetMarket` (compuesto, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `setups` → Setup (1:N, onDelete: SetNull)

**Notas:**
- Soft delete: no se elimina físicamente, solo se marca `isActive = false`
- Una estrategia puede tener múltiples setups asociados
- Si se elimina una estrategia, los setups asociados quedan sin estrategia (`strategyId = null`)

### Setup

Patrones de trading específicos dentro de una estrategia.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User (multi-tenant) |
| `strategyId` | UUID? | FK a Strategy (nullable, setup puede ser independiente) |
| `name` | String | Nombre del setup |
| `description` | String? | Descripción del setup (nullable) |
| `suggestedTags` | String[] | Tags sugeridos para identificar el setup (array) |
| `isActive` | Boolean | Si el setup está activo (default: true, para soft delete) |
| `notes` | String? | Notas adicionales (nullable) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Índices:**
- `userId` (indexado)
- `strategyId` (indexado)
- `isActive` (indexado)
- `userId, strategyId` (compuesto, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `strategy` → Strategy (N:1, onDelete: SetNull)
- `rules` → Rule (1:N, onDelete: Cascade)

**Notas:**
- Soft delete: no se elimina físicamente, solo se marca `isActive = false`
- Un setup puede existir sin estrategia asociada (`strategyId = null`)
- Un setup puede tener múltiples reglas (checklist)
- Si se elimina una estrategia, el setup queda sin estrategia pero se mantiene

### Rule

Reglas del checklist para evaluar disciplina en un setup.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (PK) |
| `userId` | UUID | FK a User (multi-tenant) |
| `setupId` | UUID | FK a Setup (obligatorio) |
| `name` | String | Nombre de la regla |
| `description` | String? | Descripción de la regla (nullable) |
| `order` | Int | Orden de la regla en el checklist (default: 0) |
| `isRequired` | Boolean | Si la regla es obligatoria (default: false) |
| `isActive` | Boolean | Si la regla está activa (default: true, para soft delete) |
| `createdAt` | DateTime | Fecha de creación |
| `updatedAt` | DateTime | Fecha de última actualización |

**Índices:**
- `userId` (indexado)
- `setupId` (indexado)
- `order` (indexado)
- `isActive` (indexado)
- `userId, setupId` (compuesto, indexado)

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `setup` → Setup (N:1, onDelete: Cascade)

**Notas:**
- Soft delete: no se elimina físicamente, solo se marca `isActive = false`
- Las reglas se ordenan por `order` y luego por `createdAt`
- Si se elimina un setup, se eliminan todas sus reglas (Cascade)
- Las reglas requeridas (`isRequired = true`) deben cumplirse obligatoriamente

## Enums

### Currency
- `COP` - Peso colombiano
- `USD` - Dólar estadounidense

### AccountType
- `SPOT` - Trading spot
- `MARGIN` - Trading con margen
- `FUTURES` - Futuros
- `CFD` - Contratos por diferencia

### AccountStatus
- `ACTIVE` - Cuenta activa
- `INACTIVE` - Cuenta inactiva
- `CLOSED` - Cuenta cerrada

### CashflowType
- `DEPOSIT` - Depósito de fondos
- `WITHDRAWAL` - Retiro de fondos
- `ADJUSTMENT` - Ajuste manual
- `FEE` - Comisión o fee externo

### InstrumentType
- `CRYPTO` - Criptomonedas
- `STOCK` - Acciones
- `ETF` - ETFs (Exchange Traded Funds)
- `FOREX` - Forex (divisas)
- `FUTURES` - Futuros
- `OPTIONS` - Opciones

## Índices

### Índices Únicos
- `User.email`
- `UserSettings.userId`
- `RefreshToken.token`
- `PasswordResetToken.token`

### Índices No Únicos
- `RefreshToken.userId`
- `PasswordResetToken.userId`
- `Account.userId`
- `Account.status`
- `Cashflow.accountId`
- `Cashflow.userId`
- `Cashflow.date`
- `Cashflow.type`
- `Cashflow.accountId, date` (compuesto)
- `AccountSnapshot.accountId`
- `AccountSnapshot.date`
- `AccountSnapshot.accountId, date` (compuesto)
- `Instrument.userId`
- `Instrument.market`
- `Instrument.symbol`
- `Instrument.type`
- `Instrument.isActive`
- `Instrument.userId, market` (compuesto)
- `Instrument.userId, type` (compuesto)
- `Strategy.userId`
- `Strategy.targetMarket`
- `Strategy.isActive`
- `Strategy.userId, targetMarket` (compuesto)
- `Setup.userId`
- `Setup.strategyId`
- `Setup.isActive`
- `Setup.userId, strategyId` (compuesto)
- `Rule.userId`
- `Rule.setupId`
- `Rule.order`
- `Rule.isActive`
- `Rule.userId, setupId` (compuesto)

## Relaciones y Constraints

### Cascade Delete
- Al eliminar un `User`, se eliminan automáticamente:
  - Su `UserSettings`
  - Todos sus `RefreshToken`
  - Todos sus `PasswordResetToken`
  - Todas sus `Account`
  - Todos sus `Cashflow` (tanto directos como a través de Account)
  - Todos sus `Instrument`
  - Todas sus `Strategy`
  - Todos sus `Setup`
  - Todas sus `Rule`
- Al eliminar un `Account`, se eliminan automáticamente:
  - Todos sus `Cashflow`
  - Todos sus `AccountSnapshot`
- Al eliminar una `Strategy`, se actualizan automáticamente:
  - Todos sus `Setup` quedan sin estrategia (`strategyId = null`)
- Al eliminar un `Setup`, se eliminan automáticamente:
  - Todas sus `Rule` (Cascade)

### Foreign Keys
- Todas las relaciones tienen foreign keys con `onDelete: Cascade` para mantener integridad referencial.

## Migraciones

Las migraciones de Prisma están en `prisma/migrations/`. Para crear una nueva migración:

```bash
npm run prisma:migrate
```

Para aplicar migraciones en producción:

```bash
npm run prisma:migrate:deploy
```

## Prisma Studio

Para visualizar y editar la base de datos con una interfaz gráfica:

```bash
npm run prisma:studio
```

Esto abrirá una interfaz web en `http://localhost:5555`.

## Diagrama de Relaciones

```
User
├── UserSettings (1:1)
├── RefreshToken (1:N)
├── PasswordResetToken (1:N)
├── Account (1:N)
│   ├── Cashflow (1:N)
│   └── AccountSnapshot (1:N)
├── Cashflow (1:N) [directa]
├── Instrument (1:N)
└── Strategy (1:N)
    └── Setup (1:N)
        └── Rule (1:N)
```

## Notas de Diseño

1. **Soft Delete**: El campo `deletedAt` en `User` permite soft delete sin perder datos históricos.

2. **Preparación para 2FA**: Los campos `twoFactorEnabled` y `twoFactorSecret` están preparados para implementación futura de autenticación de dos factores.

3. **Auditoría**: `RefreshToken` incluye `ipAddress` y `userAgent` para auditoría de seguridad.

4. **Expiración de Tokens**: 
   - `RefreshToken`: 7 días por defecto
   - `PasswordResetToken`: 1 hora por defecto

5. **Multi-tenant**: Todos los modelos incluyen `userId` para aislamiento de datos por usuario.

6. **Jerarquía de Estrategias**: Las estrategias pueden tener múltiples setups, y cada setup puede tener múltiples reglas. Esto permite una estructura jerárquica flexible para organizar el trading.

7. **Setups Independientes**: Los setups pueden existir sin estrategia asociada (`strategyId = null`), permitiendo flexibilidad en la organización.

8. **Ordenamiento de Reglas**: Las reglas se ordenan por el campo `order` y luego por `createdAt`, permitiendo un checklist ordenado y personalizable.


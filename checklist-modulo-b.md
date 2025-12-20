# Checklist Módulo B — Cuentas, Capital y Cashflows

## 📋 Resumen del Módulo

**Objetivo:** Controlar el "mundo real": depósitos, retiros, fees externos, ajustes. Separar resultados de trading vs movimientos de dinero.

**Pantallas:**

1. Lista de Cuentas
2. Detalle de Cuenta
3. Cashflows (Registro y Timeline)

**Stack relevante:**

- Backend: NestJS + PostgreSQL + Prisma
- Frontend: Vue 3 + TypeScript + Tailwind CSS
- UI: Tema oscuro por defecto, diseño minimalista tipo terminal

---

## 🔧 Backend

### 1. Base de datos — Schema Prisma

#### 1.1 Extender modelo Account

- [x] Agregar campos al modelo `Account`:
  - [x] `status` (enum: Active, Inactive, Closed, default: Active)
  - [x] `initialBalance` (Decimal, nullable, balance inicial)
  - [x] `currentBalance` (Decimal, calculado o cacheado)
  - [x] `notes` (String, nullable, notas adicionales)
  - [x] `closedAt` (DateTime, nullable, fecha de cierre)

#### 1.2 Modelo Cashflow

- [x] Crear modelo `Cashflow` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `accountId` (UUID, foreign key a Account)
  - [x] `userId` (UUID, foreign key a User, para filtrado rápido)
  - [x] `type` (enum: DEPOSIT, WITHDRAWAL, ADJUSTMENT, FEE, default: DEPOSIT)
  - [x] `amount` (Decimal, positivo para depósitos, negativo para retiros)
  - [x] `currency` (String, debe coincidir con la moneda de la cuenta)
  - [x] `description` (String, nullable, descripción del movimiento)
  - [x] `date` (DateTime, fecha del movimiento)
  - [x] `category` (String, nullable, ej: "Commission", "Subscription", "Transfer")
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 1.3 Modelo AccountSnapshot (para equity curve)

- [x] Crear modelo `AccountSnapshot` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `accountId` (UUID, foreign key a Account)
  - [x] `date` (DateTime, fecha del snapshot, indexado)
  - [x] `equity` (Decimal, equity al cierre del día)
  - [x] `balance` (Decimal, balance al cierre del día)
  - [x] `realizedPnL` (Decimal, PnL realizado acumulado)
  - [x] `unrealizedPnL` (Decimal, PnL no realizado, nullable)
  - [x] `drawdown` (Decimal, drawdown máximo hasta esa fecha)
  - [x] `createdAt` (DateTime)

#### 1.4 Relaciones Prisma

- [x] Configurar relación `Account` → `Cashflow` (1:N)
- [x] Configurar relación `Account` → `AccountSnapshot` (1:N)
- [x] Configurar relación `User` → `Cashflow` (1:N, para filtrado rápido)
- [x] Configurar `onDelete: Cascade` donde corresponda
- [x] Agregar índices:
  - [x] `Cashflow.accountId` (indexado)
  - [x] `Cashflow.userId` (indexado)
  - [x] `Cashflow.date` (indexado)
  - [x] `Cashflow.type` (indexado)
  - [x] `Cashflow.accountId, date` (índice compuesto)
  - [x] `AccountSnapshot.accountId` (indexado)
  - [x] `AccountSnapshot.date` (indexado)
  - [x] `AccountSnapshot.accountId, date` (índice compuesto y único)

#### 1.5 Migraciones

- [ ] Crear migración para extender Account
- [ ] Crear migración para Cashflow
- [ ] Crear migración para AccountSnapshot
- [ ] Ejecutar migraciones en desarrollo
- [ ] Verificar índices y constraints

### 2. Módulo Accounts (extensión)

#### 2.1 DTOs

- [x] Crear `UpdateAccountDto`:
  - [x] `name` (string, opcional)
  - [x] `broker` (string, opcional)
  - [x] `status` (enum, opcional)
  - [x] `notes` (string, opcional)
- [x] Crear `AccountDetailResponseDto`:
  - [x] Datos de la cuenta
  - [x] `currentBalance` (calculado)
  - [x] `equity` (calculado)
  - [x] `drawdown` (calculado)
  - [x] `monthlyReturn` (calculado)
  - [x] `totalCashflows` (suma de cashflows)
  - [x] `totalRealizedPnL` (calculado desde trades - preparado, retorna 0 hasta que haya trades)

#### 2.2 Servicios

- [x] Extender `AccountsService` con métodos:
  - [x] `update(id: string, userId: string, updateDto: UpdateAccountDto)` → actualizar cuenta
  - [x] `findOne(id: string, userId: string)` → obtener cuenta con detalles
  - [x] `getAccountDetails(id: string, userId: string)` → obtener detalles completos (balance, equity, DD, etc.)
  - [x] `calculateEquity(accountId: string, date?: Date)` → calcular equity en una fecha
  - [x] `calculateDrawdown(accountId: string)` → calcular drawdown actual
  - [x] `calculateMonthlyReturn(accountId: string, month: number, year: number)` → rendimiento mensual
  - [x] `closeAccount(id: string, userId: string)` → cerrar cuenta (soft delete o status)
  - [x] `calculateBalance(accountId: string)` → calcular balance desde cashflows
  - [x] `getTotalCashflows(accountId: string)` → suma total de cashflows

#### 2.3 Controladores

- [x] `GET /accounts/:id` → obtener detalle de cuenta (protegido)
  - [x] Retornar cuenta con detalles calculados
- [x] `PATCH /accounts/:id` → actualizar cuenta (protegido)
  - [x] Validar que la cuenta pertenece al usuario
  - [x] Actualizar campos permitidos
- [x] `DELETE /accounts/:id` → cerrar cuenta (protegido)
  - [x] Validar que la cuenta pertenece al usuario
  - [x] Cambiar status a Closed o soft delete

### 3. Módulo Cashflows (nuevo)

#### 3.1 DTOs

- [x] Crear `CreateCashflowDto`:
  - [x] `accountId` (UUID, requerido)
  - [x] `type` (enum: DEPOSIT, WITHDRAWAL, ADJUSTMENT, FEE, requerido)
  - [x] `amount` (Decimal, requerido, positivo)
  - [x] `currency` (String, requerido)
  - [x] `description` (String, opcional)
  - [x] `date` (DateTime, requerido, default: ahora)
  - [x] `category` (String, opcional)
- [x] Crear `UpdateCashflowDto`:
  - [x] Todos los campos opcionales (excepto accountId)
- [x] Crear `CashflowResponseDto`:
  - [x] Todos los campos del cashflow
  - [x] `account` (objeto con nombre de cuenta)
- [x] Crear `CashflowListQueryDto`:
  - [x] `accountId` (UUID, opcional, filtro)
  - [x] `type` (enum, opcional, filtro)
  - [x] `startDate` (DateTime, opcional)
  - [x] `endDate` (DateTime, opcional)
  - [x] `page` (number, opcional, default: 1)
  - [x] `limit` (number, opcional, default: 50)

#### 3.2 Servicios

- [x] Crear `CashflowsService` con métodos:
  - [x] `create(userId: string, createDto: CreateCashflowDto)` → crear cashflow
  - [x] `findAll(userId: string, query: CashflowListQueryDto)` → listar con filtros y paginación
  - [x] `findOne(id: string, userId: string)` → obtener cashflow por ID
  - [x] `update(id: string, userId: string, updateDto: UpdateCashflowDto)` → actualizar cashflow
  - [x] `delete(id: string, userId: string)` → eliminar cashflow
  - [x] `getTotalByAccount(accountId: string, userId: string)` → suma total de cashflows por cuenta
  - [x] `getTimeline(userId: string, accountId?: string, startDate?: Date, endDate?: Date)` → timeline ordenado

#### 3.3 Controladores

- [x] `POST /cashflows` → crear cashflow (protegido)
  - [x] Validar que la cuenta pertenece al usuario
  - [x] Validar que la moneda coincide con la cuenta
  - [x] Crear cashflow
  - [x] Actualizar balance de cuenta automáticamente
- [x] `GET /cashflows` → listar cashflows (protegido)
  - [x] Aplicar filtros (accountId, type, fechas)
  - [x] Paginación
  - [x] Ordenar por fecha descendente
- [x] `GET /cashflows/timeline` → obtener timeline (protegido)
  - [x] Filtros opcionales por cuenta y fechas
- [x] `GET /cashflows/account/:accountId/total` → obtener total por cuenta (protegido)
- [x] `GET /cashflows/:id` → obtener cashflow (protegido)
  - [x] Validar que pertenece al usuario
- [x] `PATCH /cashflows/:id` → actualizar cashflow (protegido)
  - [x] Validar que pertenece al usuario
  - [x] Actualizar campos permitidos
  - [x] Actualizar balance de cuenta automáticamente
- [x] `DELETE /cashflows/:id` → eliminar cashflow (protegido)
  - [x] Validar que pertenece al usuario
  - [x] Eliminar cashflow
  - [x] Actualizar balance de cuenta automáticamente

### 4. Cálculos y métricas

#### 4.1 Equity Calculation

- [x] Implementar cálculo de equity:
  - [x] `Equity = Balance + RealizedPnL + UnrealizedPnL`
  - [x] `Balance = InitialBalance + sum(Cashflows)` (implementado en `calculateBalance`)
  - [x] `RealizedPnL = sum(NetPnL de trades cerrados)` (preparado, retorna 0 hasta que haya trades)
  - [x] `UnrealizedPnL = sum(PnL no realizado de trades abiertos)` (preparado, retorna 0 hasta que haya trades)
- [x] Crear función helper `calculateEquity(accountId, date?)` (mejorada con UnrealizedPnL)

#### 4.2 Drawdown Calculation

- [x] Implementar cálculo de drawdown:
  - [x] `Drawdown = (Peak Equity - Current Equity) / Peak Equity * 100`
  - [x] `Max Drawdown = máximo drawdown histórico` (implementado en `getMaxDrawdown`)
- [x] Crear función helper `calculateDrawdown(accountId)` (mejorada)

#### 4.3 Monthly Return

- [x] Implementar cálculo de rendimiento mensual:
  - [x] `Monthly Return = (Equity End - Equity Start) / Equity Start * 100`
  - [x] Considerar cashflows del mes (calculado desde snapshots o equity)
- [x] Crear función helper `calculateMonthlyReturn(accountId, month, year)` (implementada)

#### 4.4 Account Snapshots

- [x] Crear servicio/job para generar snapshots diarios:
  - [x] Calcular equity al cierre del día
  - [x] Guardar snapshot en `AccountSnapshot` (usando upsert por constraint único)
  - [x] Usar para equity curve (más eficiente que calcular en tiempo real)
  - [x] Scheduled task diario a las 23:59 UTC (`SnapshotsSchedulerService`)
- [x] Crear endpoint o función para regenerar snapshots históricos:
  - [x] `POST /accounts/:id/snapshots/regenerate` (con filtros de fecha opcionales)
  - [x] `regenerateHistoricalSnapshots()` para una cuenta
  - [x] `regenerateAllHistoricalSnapshots()` para todas las cuentas

### 5. Validaciones y reglas de negocio

- [x] Validar que el usuario solo puede acceder a sus propias cuentas
  - [x] Implementado en `AccountsService.findOne()` y todos los métodos
  - [x] Implementado en `CashflowsService` para todos los métodos
  - [x] Validación de propiedad en todos los endpoints
- [x] Validar que la moneda del cashflow coincide con la moneda de la cuenta
  - [x] Implementado en `CashflowsService.create()` y `update()`
  - [x] Retorna BadRequestException con mensaje claro
- [x] Validar que los cashflows no pueden ser futuros
  - [x] Validator personalizado `IsNotFutureDate` creado
  - [x] Aplicado en `CreateCashflowDto` y `UpdateCashflowDto`
  - [x] Validación adicional en `CashflowsService.create()` y `update()`
  - [x] Permite hasta el final del día actual
- [x] Validar que no se pueden eliminar cuentas con trades asociados (o soft delete)
  - [x] Implementado soft delete en `closeAccount()` (cambia status a CLOSED)
  - [x] Valida que la cuenta no esté ya cerrada
  - [x] Preserva historial de cashflows y snapshots
  - [x] TODO: Validar trades abiertos cuando exista el modelo Trade
- [x] Validar que los amounts de cashflow son positivos (el signo se maneja por tipo)
  - [x] Implementado en `CreateCashflowDto` con `@Min(0.01)`
  - [x] El signo se maneja por tipo (DEPOSIT/ADJUSTMENT positivo, WITHDRAWAL/FEE negativo)

---

## 🎨 Frontend

### 6. Pantalla: Lista de Cuentas

#### 6.1 Componente AccountsListView

- [x] Crear componente `AccountsListView.vue`
- [x] Tabla de cuentas con columnas:
  - [x] Nombre
  - [x] Broker/Exchange
  - [x] Tipo (Spot, Margin, Futures, CFD)
  - [x] Moneda
  - [x] Balance actual
  - [x] Equity
  - [x] Drawdown
  - [x] Rendimiento mensual
  - [x] Estado (Active, Inactive, Closed)
  - [x] Acciones (Ver detalle, Editar, Cerrar)
- [x] Botón "Nueva Cuenta" (redirige a formulario)
- [x] Filtros:
  - [x] Por tipo de cuenta
  - [x] Por estado
  - [x] Por moneda
- [x] Búsqueda por nombre/broker
- [x] Ordenamiento por columnas
- [x] Loading state
- [x] Estado vacío (sin cuentas)

#### 6.2 Store para Accounts

- [x] Crear store `useAccountsStore` con:
  - [x] Estado: `accounts`, `selectedAccount`, `loading`, `error`
  - [x] Acciones:
    - [x] `fetchAccounts()` → obtener lista de cuentas
    - [x] `fetchAccountDetails(id)` → obtener detalle de cuenta
    - [x] `createAccount(data)` → crear cuenta
    - [x] `updateAccount(id, data)` → actualizar cuenta
    - [x] `closeAccount(id)` → cerrar cuenta
  - [x] Getters: `activeAccounts`, `accountsByCurrency`, `accountsByType`
  - [x] Helpers: `clearSelectedAccount()`, `clearError()`

### 7. Pantalla: Detalle de Cuenta

#### 7.1 Componente AccountDetailView

- [x] Crear componente `AccountDetailView.vue`
- [x] Sección de información general:
  - [x] Nombre, broker, tipo, moneda, estado
  - [x] Fecha de creación
  - [x] Botones: Editar, Cerrar cuenta
- [x] Sección de métricas:
  - [x] Balance actual (monoespaciado)
  - [x] Equity actual (monoespaciado)
  - [x] Drawdown actual (con color: verde si bajo, rojo si alto)
  - [x] Rendimiento mensual (con color)
  - [x] Total de cashflows (suma)
  - [x] Total de trades (PnL realizado, preparado para cuando haya trades)
- [x] Sección de equity curve (gráfico):
  - [x] Gráfico de línea con equity a lo largo del tiempo
  - [x] Usar Apache ECharts
  - [x] Mostrar drawdown como área sombreada
  - [x] Componente `EquityChart.vue` reutilizable
- [x] Sección de cashflows recientes:
  - [x] Tabla con últimos 10 cashflows
  - [x] Link a ver todos los cashflows
- [x] Loading state
- [x] Manejo de errores

#### 7.2 Componente AccountForm

- [x] Crear componente `AccountFormView.vue` (reutilizable para crear/editar)
- [x] Campos:
  - [x] Nombre (requerido)
  - [x] Broker/Exchange (opcional)
  - [x] Tipo (select: Spot, Margin, Futures, CFD)
  - [x] Moneda (select, default: moneda base del usuario)
  - [x] Balance inicial (opcional, numérico)
  - [x] Notas (textarea, opcional)
- [x] Validaciones
- [x] Modo crear vs editar
- [x] Botones: Guardar, Cancelar
- [x] Componente `Textarea.vue` creado

### 8. Pantalla: Cashflows

#### 8.1 Componente CashflowsView

- [x] Crear componente `CashflowsView.vue`
- [x] Vista de timeline:
  - [x] Lista cronológica de cashflows (más recientes primero)
  - [x] Agrupación visual por tipo (con indicadores de color)
  - [x] Cada item muestra:
    - [x] Fecha (formato completo)
    - [x] Tipo (con badge y color)
    - [x] Cuenta
    - [x] Monto (con color: verde depósito, rojo retiro)
    - [x] Descripción
    - [x] Acciones (Editar, Eliminar)
- [x] Filtros:
  - [x] Por cuenta (select)
  - [x] Por tipo (select: Depósito, Retiro, Ajuste, Fee)
  - [x] Por rango de fechas (date picker)
  - [x] Búsqueda por descripción
- [x] Paginación
- [x] Botón "Nuevo Cashflow" (redirige a formulario)
- [x] Totales:
  - [x] Total de depósitos
  - [x] Total de retiros
  - [x] Total de ajustes
  - [x] Neto (depósitos + ajustes - retiros - fees)

#### 8.2 Componente CashflowForm

- [x] Crear componente `CashflowFormView.vue` (página)
- [x] Campos:
  - [x] Cuenta (select, requerido)
  - [x] Tipo (radio buttons: Depósito, Retiro, Ajuste, Fee)
  - [x] Monto (numérico, requerido, siempre positivo)
  - [x] Moneda (auto-completado desde cuenta, readonly)
  - [x] Fecha (datetime-local, default: ahora)
  - [x] Descripción (textarea, opcional)
  - [x] Categoría (select opcional: Commission, Subscription, Transfer, Other)
- [x] Validaciones:
  - [x] Monto > 0
  - [x] Fecha no futura
  - [x] Moneda coincide con cuenta
- [x] Modo crear vs editar
- [x] Botones: Guardar, Cancelar
- [x] Preview del efecto en balance

#### 8.3 Store para Cashflows

- [x] Crear store `useCashflowsStore` con:
  - [x] Estado: `cashflows`, `loading`, `filters`, `pagination`, `error`
  - [x] Acciones:
    - [x] `fetchCashflows(filters?)` → obtener cashflows con filtros
    - [x] `createCashflow(data)` → crear cashflow
    - [x] `updateCashflow(id, data)` → actualizar cashflow
    - [x] `deleteCashflow(id)` → eliminar cashflow
    - [x] `getTotals()` → calcular totales
  - [x] Getters: `filteredCashflows`, `depositsTotal`, `withdrawalsTotal`, `netTotal`, `totals`
  - [x] Helpers: `clearFilters()`, `clearError()`

### 9. Componentes UI adicionales

#### 9.1 Componente CurrencyDisplay

- [x] Crear componente `CurrencyDisplay.vue`
- [x] Mostrar monto con formato de moneda
- [x] Símbolo de moneda ($, COP, etc.)
- [x] Separador de miles
- [x] Decimales (2 para USD, 0 para COP)
- [x] Color condicional (verde positivo, rojo negativo, neutral cero)
- [x] Prop `showSign` para mostrar signo +/-
- [x] Prop `variant` para forzar color o auto-detectar

#### 9.2 Componente DrawdownBadge

- [x] Crear componente `DrawdownBadge.vue`
- [x] Mostrar drawdown como badge/chip
- [x] Color según nivel:
  - [x] Verde: < 5%
  - [x] Amarillo: 5-15%
  - [x] Rojo: > 15%
- [x] Formato: "DD: 12.5%"
- [x] Prop `size` para tamaño del badge

#### 9.3 Componente EquityChart

- [x] Crear componente `EquityChart.vue`
- [x] Gráfico de línea con Apache ECharts
- [x] Mostrar equity a lo largo del tiempo
- [x] Área sombreada para drawdown
- [x] Tooltip con detalles al hover
- [x] Responsive
- [x] Tema oscuro

#### 9.4 Componente CashflowTimeline

- [x] Crear componente `CashflowTimeline.vue`
- [x] Timeline visual con items
- [x] Agrupación por fecha
- [x] Iconos por tipo (símbolos: +, -, ±, F)
- [x] Colores por tipo (verde depósito, rojo retiro)
- [x] Animaciones suaves (fadeInUp)
- [x] Líneas conectoras entre items
- [x] Integración con CurrencyDisplay y Badge

### 10. Rutas

- [x] Ruta `/accounts` → AccountsListView
- [x] Ruta `/accounts/new` → AccountFormView (crear)
- [x] Ruta `/accounts/:id` → AccountDetailView
- [x] Ruta `/accounts/:id/edit` → AccountFormView (editar)
- [x] Ruta `/cashflows` → CashflowsView
- [x] Ruta `/cashflows/new` → CashflowFormView (crear)
- [x] Ruta `/cashflows/:id/edit` → CashflowFormView (editar)
- [x] Guards: todas las rutas requieren autenticación
  - [x] `requiresAuth: true` en todas las rutas protegidas
  - [x] `requiresOnboarding: true` para rutas del módulo B
  - [x] Guard implementado en `router.beforeEach`
  - [x] Redirección a Login si no autenticado
  - [x] Redirección a Onboarding si no completado

---

## 🧪 Testing

### 11. Tests backend

#### 11.1 Tests unitarios AccountsService

- [x] `update`: actualizar cuenta correctamente
- [x] `update`: rechazar si cuenta no pertenece al usuario
- [x] `update`: lanzar NotFoundException si cuenta no existe
- [x] `getAccountDetails`: calcular balance correctamente
- [x] `getAccountDetails`: calcular equity correctamente
- [x] `calculateDrawdown`: calcular drawdown correctamente
- [x] `calculateDrawdown`: retornar 0 si no hay snapshots
- [x] `calculateMonthlyReturn`: calcular rendimiento mensual correctamente
- [x] `calculateMonthlyReturn`: retornar 0 si startEquity es 0 o negativo
- [x] `closeAccount`: cerrar cuenta correctamente
- [x] `closeAccount`: rechazar si cuenta no pertenece al usuario
- [x] `closeAccount`: rechazar si cuenta ya está cerrada

#### 11.2 Tests unitarios CashflowsService

- [x] `create`: crear cashflow correctamente
- [x] `create`: validar moneda coincide con cuenta
- [x] `create`: rechazar si cuenta no pertenece al usuario
- [x] `create`: validar que la fecha no sea futura
- [x] `findAll`: aplicar filtros correctamente
- [x] `findAll`: paginación correcta
- [x] `update`: actualizar cashflow correctamente
- [x] `update`: validar moneda si se actualiza
- [x] `delete`: eliminar cashflow correctamente
- [x] `delete`: rechazar si cashflow no pertenece al usuario
- [x] `getTotalByAccount`: calcular totales correctamente
- [x] `getTotalByAccount`: rechazar si cuenta no pertenece al usuario

#### 11.3 Tests de integración

- [x] `POST /cashflows`: crear cashflow exitosamente
- [x] `POST /cashflows`: validar moneda coincide con cuenta
- [x] `POST /cashflows`: validar que cuenta pertenece al usuario
- [x] `POST /cashflows`: validar que fecha no sea futura
- [x] `GET /cashflows`: listar con filtros
- [x] `GET /cashflows`: paginación correcta
- [x] `GET /accounts/:id`: obtener detalle con métricas
- [x] `GET /accounts/:id`: rechazar si cuenta no pertenece al usuario
- [x] `PATCH /accounts/:id`: actualizar cuenta
- [x] `PATCH /cashflows/:id`: actualizar cashflow
- [x] `DELETE /cashflows/:id`: eliminar cashflow
- [x] Validar que equity se calcula correctamente después de cashflow

### 12. Tests frontend

#### 12.1 Tests unitarios componentes

- [ ] `AccountsListView`: renderizar lista de cuentas
- [ ] `AccountsListView`: aplicar filtros
- [ ] `AccountDetailView`: mostrar métricas correctamente
- [ ] `CashflowsView`: renderizar timeline
- [ ] `CashflowForm`: validar formulario

#### 12.2 Tests de stores

- [ ] `useAccountsStore`: fetchAccounts, createAccount, updateAccount
- [ ] `useCashflowsStore`: fetchCashflows, createCashflow, aplicar filtros

---

## 📝 Documentación

### 13. Documentación técnica

- [x] Documentar endpoints de API en Swagger:
  - [x] Endpoints de accounts (extendidos)
  - [x] Endpoints de cashflows
- [x] Documentar cálculos de equity, drawdown, rendimiento
- [x] Actualizar `docs/DATABASE.md` con nuevos modelos
- [x] Documentar reglas de negocio en README

---

## ✅ Criterios de aceptación

### Funcionalidad

- [ ] Usuario puede crear múltiples cuentas por mercado
- [ ] Usuario puede ver lista de cuentas con métricas
- [ ] Usuario puede ver detalle de cuenta con equity curve
- [ ] Usuario puede registrar depósitos/retiros/ajustes
- [ ] Usuario puede ver timeline de cashflows con filtros
- [ ] Equity se calcula correctamente (balance + PnL realizado)
- [ ] Drawdown se calcula y muestra correctamente
- [ ] Rendimiento mensual se calcula correctamente
- [ ] Cashflows afectan el balance de la cuenta
- [ ] Los cálculos separan trading PnL vs movimientos de dinero

### Validaciones

- [ ] Usuario solo puede acceder a sus propias cuentas
- [ ] Moneda de cashflow debe coincidir con moneda de cuenta
- [ ] Montos de cashflow son positivos
- [ ] Fechas de cashflow no pueden ser futuras (o con validación)

### UI/UX

- [ ] Tablas son responsivas y legibles
- [ ] Gráficos de equity son claros y informativos
- [ ] Timeline de cashflows es fácil de navegar
- [ ] Formularios tienen validación visual
- [ ] Loading states en todas las operaciones
- [ ] Mensajes de error claros

---

## 🚀 Próximos pasos (después del Módulo B)

Una vez completado el Módulo B, se puede proceder con:

- Módulo C: Catálogo de instrumentos
- Módulo D: Estrategias, setups y reglas
- Módulo E: Operaciones (Trade Lifecycle) - el módulo principal

---

**Notas:**

- El cálculo de equity considera cashflows y PnL realizado de trades (Módulo E)
- Los snapshots diarios optimizan el rendimiento de la equity curve
- El drawdown se calcula desde el peak equity histórico
- Los cashflows pueden ser ajustados/eliminados si no hay trades asociados

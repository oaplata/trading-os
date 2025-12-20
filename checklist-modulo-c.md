# Checklist Módulo C — Catálogo de Instrumentos (Multi-mercado)

## 📋 Resumen del Módulo

**Objetivo:** Crear un catálogo de instrumentos normalizado para múltiples mercados (crypto, stocks, ETFs, forex) usando el formato `MARKET:SYMBOL`. Permite registrar instrumentos rápidamente sin depender de integraciones externas y mantener consistencia en reportes.

**Decisión de diseño:**

- Ticker normalizado: `MARKET:SYMBOL`
- Ejemplos: `BINANCE:BTCUSDT`, `NASDAQ:AAPL`, `NYSE:SPY`, `FX:EURUSD`

**Pantallas:**

1. Lista de Instrumentos (con búsqueda)
2. Formulario de Crear/Editar Instrumento
3. Detalle de Instrumento (opcional, para estadísticas futuras)

**Stack relevante:**

- Backend: NestJS + PostgreSQL + Prisma
- Frontend: Vue 3 + TypeScript + Tailwind CSS
- UI: Tema oscuro por defecto, diseño minimalista tipo terminal

---

## 🔧 Backend

### 1. Base de datos — Schema Prisma

#### 1.1 Modelo Instrument

- [x] Crear modelo `Instrument` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User, para multi-tenant)
  - [x] `market` (String, ej: "BINANCE", "NASDAQ", "NYSE", "FX")
  - [x] `symbol` (String, ej: "BTCUSDT", "AAPL", "SPY", "EURUSD")
  - [x] `ticker` (String, computed/virtual: `MARKET:SYMBOL`, indexado único por usuario)
  - [x] `name` (String, nombre completo, ej: "Bitcoin", "Apple Inc.", "SPDR S&P 500 ETF")
  - [x] `type` (enum: CRYPTO, STOCK, ETF, FOREX, FUTURES, OPTIONS, default: CRYPTO)
  - [x] `currencyQuote` (String, moneda de cotización, ej: "USD", "USDT", "EUR")
  - [x] `tickSize` (Decimal, nullable, tamaño mínimo de movimiento de precio)
  - [x] `contractSize` (Decimal, nullable, tamaño de contrato para forex/futures)
  - [x] `isActive` (Boolean, default: true, para soft delete)
  - [x] `notes` (String, nullable, notas adicionales)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 1.2 Enum InstrumentType

- [x] Crear enum `InstrumentType`:
  - [x] `CRYPTO` - Criptomonedas
  - [x] `STOCK` - Acciones
  - [x] `ETF` - ETFs
  - [x] `FOREX` - Forex
  - [x] `FUTURES` - Futuros
  - [x] `OPTIONS` - Opciones

#### 1.3 Relaciones Prisma

- [x] Configurar relación `User` → `Instrument` (1:N)
- [x] Configurar `onDelete: Cascade` para Instrument cuando se elimina User
- [x] Agregar índices:
  - [x] `Instrument.userId` (indexado)
  - [x] `Instrument.market` (indexado)
  - [x] `Instrument.symbol` (indexado)
  - [x] `Instrument.type` (indexado)
  - [x] `Instrument.ticker` (indexado único por usuario: `userId + ticker`)
  - [x] `Instrument.isActive` (indexado)
  - [x] `Instrument.userId, market` (índice compuesto para búsquedas)
  - [x] `Instrument.userId, type` (índice compuesto para filtros)

#### 1.4 Migraciones

- [x] Crear migración para modelo Instrument
- [x] Crear migración para enum InstrumentType
- [x] Ejecutar migraciones en desarrollo
- [x] Verificar índices y constraints
- [x] Verificar constraint único de `ticker` por usuario

### 2. Módulo Instruments (nuevo)

#### 2.1 DTOs

- [x] Crear `CreateInstrumentDto`:
  - [x] `market` (string, requerido, validación: no vacío)
  - [x] `symbol` (string, requerido, validación: no vacío, uppercase)
  - [x] `name` (string, requerido, validación: no vacío)
  - [x] `type` (enum InstrumentType, requerido)
  - [x] `currencyQuote` (string, requerido, validación: código de moneda válido)
  - [x] `tickSize` (number, opcional, validación: > 0)
  - [x] `contractSize` (number, opcional, validación: > 0)
  - [x] `notes` (string, opcional)
- [x] Crear `UpdateInstrumentDto`:
  - [x] Todos los campos opcionales (excepto market y symbol que no se pueden cambiar)
  - [x] Validaciones similares a CreateInstrumentDto
- [x] Crear `InstrumentResponseDto`:
  - [x] Todos los campos del modelo
  - [x] `ticker` (string, formato: `MARKET:SYMBOL`)
  - [x] Campos calculados si aplica
- [x] Crear `InstrumentListQueryDto`:
  - [x] `market` (string, opcional, filtro)
  - [x] `type` (enum, opcional, filtro)
  - [x] `search` (string, opcional, búsqueda en name/symbol/ticker)
  - [x] `isActive` (boolean, opcional, filtro)
  - [x] `page` (number, opcional, default: 1)
  - [x] `limit` (number, opcional, default: 50, max: 100)

#### 2.2 Service — InstrumentsService

- [x] Crear `InstrumentsService` con métodos:
  - [x] `create(userId, createDto)`: Crear instrumento
    - [x] Validar que el ticker no exista para el usuario
    - [x] Normalizar symbol a uppercase
    - [x] Generar ticker automáticamente: `MARKET:SYMBOL`
    - [x] Validar que market y symbol no estén vacíos
  - [x] `findAll(userId, query)`: Listar instrumentos con filtros y paginación
    - [x] Filtrar por userId (multi-tenant)
    - [x] Aplicar filtros de query (market, type, isActive)
    - [x] Búsqueda en name, symbol, ticker
    - [x] Paginación
    - [x] Ordenar por nombre o ticker
  - [x] `findOne(id, userId)`: Obtener instrumento por ID
    - [x] Validar propiedad (userId)
    - [x] Lanzar NotFoundException si no existe
  - [x] `findByTicker(ticker, userId)`: Buscar por ticker
    - [x] Útil para validaciones en otros módulos
  - [x] `update(id, userId, updateDto)`: Actualizar instrumento
    - [x] Validar propiedad
    - [x] No permitir cambiar market y symbol (crear nuevo si es necesario)
    - [x] Actualizar ticker si cambia market o symbol (aunque no debería)
  - [x] `delete(id, userId)`: Soft delete (marcar isActive = false)
    - [x] Validar propiedad
    - [ ] Verificar que no esté en uso en trades abiertos (validación futura)
  - [x] `search(userId, query)`: Búsqueda rápida (autocomplete)
    - [x] Buscar en name, symbol, ticker
    - [x] Limitar resultados (ej: 10)
    - [x] Ordenar por relevancia o nombre

#### 2.3 Controller — InstrumentsController

- [x] Crear `InstrumentsController` con endpoints:
  - [x] `POST /instruments`: Crear instrumento
    - [x] Autenticación requerida (JwtAuthGuard)
    - [x] Validar DTO
    - [x] Retornar 201 Created
  - [x] `GET /instruments`: Listar instrumentos
    - [x] Autenticación requerida
    - [x] Query params para filtros y paginación
    - [x] Retornar lista paginada
  - [x] `GET /instruments/search`: Búsqueda rápida (autocomplete)
    - [x] Query param `q` para término de búsqueda
    - [x] Retornar lista limitada (10-20 resultados)
  - [x] `GET /instruments/:id`: Obtener instrumento por ID
    - [x] Autenticación requerida
    - [x] Validar propiedad
    - [x] Retornar 404 si no existe
  - [x] `GET /instruments/ticker/:ticker`: Buscar por ticker
    - [x] Autenticación requerida
    - [x] Validar formato de ticker (MARKET:SYMBOL)
    - [x] Retornar instrumento o 404
  - [x] `PATCH /instruments/:id`: Actualizar instrumento
    - [x] Autenticación requerida
    - [x] Validar propiedad
    - [x] Validar DTO
  - [x] `DELETE /instruments/:id`: Eliminar instrumento (soft delete)
    - [x] Autenticación requerida
    - [x] Validar propiedad
    - [x] Retornar 204 No Content

#### 2.4 Validaciones y reglas de negocio

- [x] Validar formato de ticker: `MARKET:SYMBOL`
  - [x] Market no puede estar vacío
  - [x] Symbol no puede estar vacío
  - [x] No permitir caracteres especiales en market (solo letras, números, guiones)
  - [x] Symbol debe ser uppercase
- [x] Validar unicidad de ticker por usuario
  - [x] No permitir duplicados de `MARKET:SYMBOL` para el mismo usuario
  - [x] Permitir mismo ticker para diferentes usuarios (multi-tenant)
- [ ] Validar tipo de instrumento según campos requeridos:
  - [ ] FOREX: `contractSize` recomendado (validación futura)
  - [ ] FUTURES: `contractSize` recomendado (validación futura)
  - [ ] CRYPTO: `tickSize` opcional pero útil
- [x] Validar código de moneda (currencyQuote):
  - [x] Lista de monedas válidas (USD, EUR, GBP, JPY, USDT, etc.)
  - [x] O validación flexible (2-4 caracteres uppercase)
- [x] Soft delete:
  - [x] No eliminar físicamente, solo marcar `isActive = false`
  - [x] Filtrar por `isActive = true` en listados por defecto
  - [x] Permitir reactivar instrumentos (mediante update)

#### 2.5 Module — InstrumentsModule

- [x] Crear `InstrumentsModule`
- [x] Importar `PrismaModule`
- [x] Registrar `InstrumentsService` y `InstrumentsController`
- [x] Exportar `InstrumentsService` (para uso en otros módulos)
- [x] Registrar en `AppModule`

### 3. Integración con AppModule

- [x] Importar `InstrumentsModule` en `AppModule`
- [x] Verificar que las rutas estén disponibles en `/api/instruments`
- [x] Agregar tag de Swagger: `instruments`

---

## 🎨 Frontend

### 4. Tipos TypeScript

- [x] Actualizar `frontend/src/types/index.ts`:
  - [x] `InstrumentType`: `'CRYPTO' | 'STOCK' | 'ETF' | 'FOREX' | 'FUTURES' | 'OPTIONS'`
  - [x] `Instrument`: Interface completa
  - [x] `CreateInstrumentDto`: Interface
  - [x] `UpdateInstrumentDto`: Interface
  - [x] `InstrumentListQuery`: Interface para filtros

### 5. Store Pinia — useInstrumentsStore

- [x] Crear `frontend/src/stores/instruments.ts`:
  - [x] State:
    - [x] `instruments` (ref<Instrument[]>)
    - [x] `selectedInstrument` (ref<Instrument | null>)
    - [x] `loading` (ref<boolean>)
    - [x] `error` (ref<string | null>)
    - [x] `filters` (ref<InstrumentListQuery>)
    - [x] `pagination` (ref con total, page, limit, totalPages)
  - [x] Getters:
    - [x] `activeInstruments`: Filtrar por isActive
    - [x] `instrumentsByType`: Agrupar por tipo
    - [x] `instrumentsByMarket`: Agrupar por market
    - [x] `filteredInstruments`: Aplicar filtros locales
  - [x] Actions:
    - [x] `fetchInstruments(query?)`: Cargar lista con filtros
    - [x] `searchInstruments(query)`: Búsqueda rápida (autocomplete)
    - [x] `fetchInstrument(id)`: Cargar detalle
    - [x] `createInstrument(data)`: Crear nuevo
    - [x] `updateInstrument(id, data)`: Actualizar
    - [x] `deleteInstrument(id)`: Soft delete
    - [x] `findByTicker(ticker)`: Buscar por ticker
    - [x] `clearFilters()`: Limpiar filtros
    - [x] `clearError()`: Limpiar error

### 6. Pantalla: Lista de Instrumentos

- [x] Crear `frontend/src/views/InstrumentsListView.vue`:
  - [x] Header con título y botón "Nuevo Instrumento"
  - [x] Barra de búsqueda (búsqueda en tiempo real o con botón)
  - [x] Filtros:
    - [x] Filtro por Market (select)
    - [x] Filtro por Tipo (select con todos los tipos)
    - [x] Filtro por Estado (activo/inactivo)
  - [x] Tabla de instrumentos:
    - [x] Columnas: Ticker, Nombre, Tipo, Market, Moneda, Estado, Acciones
    - [x] Ordenamiento por columnas (ticker, nombre, tipo)
    - [x] Paginación
    - [x] Acciones: Ver, Editar, Eliminar (soft delete)
  - [x] Estado vacío: Mensaje si no hay instrumentos
  - [x] Loading state: Spinner mientras carga
  - [x] Integración con `useInstrumentsStore`

### 7. Pantalla: Formulario de Instrumento

- [x] Crear `frontend/src/views/InstrumentFormView.vue`:
  - [x] Modo creación y edición (detectar por route params)
  - [x] Formulario con campos:
    - [x] Market (input text, requerido)
      - [x] Placeholder: "BINANCE", "NASDAQ", "NYSE", "FX"
      - [x] Validación: no vacío, uppercase
    - [x] Symbol (input text, requerido)
      - [x] Placeholder: "BTCUSDT", "AAPL", "SPY", "EURUSD"
      - [x] Validación: no vacío, uppercase automático
      - [x] Mostrar ticker generado: `MARKET:SYMBOL` (readonly, preview)
    - [x] Nombre (input text, requerido)
      - [x] Placeholder: "Bitcoin", "Apple Inc.", "SPDR S&P 500 ETF"
    - [x] Tipo (select, requerido)
      - [x] Opciones: CRYPTO, STOCK, ETF, FOREX, FUTURES, OPTIONS
    - [x] Moneda de Cotización (select, requerido)
      - [x] Opciones comunes: USD, EUR, GBP, JPY, USDT, etc.
      - [x] O input text con validación
    - [x] Tick Size (input number, opcional)
      - [x] Placeholder: "0.01", "0.0001"
      - [x] Validación: > 0 si se proporciona
    - [x] Contract Size (input number, opcional)
      - [x] Placeholder: "100000" (para forex)
      - [x] Validación: > 0 si se proporciona
      - [x] Hint: "Requerido para FOREX y FUTURES"
    - [x] Notas (textarea, opcional)
  - [x] Validación de formulario:
    - [x] Validar que ticker no esté duplicado (en creación)
    - [x] Mostrar error si el ticker ya existe
  - [x] Botones: Guardar, Cancelar
  - [x] Integración con `useInstrumentsStore`

### 8. Componentes UI adicionales

- [ ] Crear `frontend/src/components/instruments/InstrumentBadge.vue`:
  - [ ] Badge que muestra el ticker con estilo
  - [ ] Color según tipo de instrumento
  - [ ] Tooltip con información adicional
- [ ] Crear `frontend/src/components/instruments/InstrumentTypeIcon.vue`:
  - [ ] Icono según tipo (crypto, stock, etf, forex)
  - [ ] Reutilizable en listas y detalles
- [ ] Crear `frontend/src/components/instruments/InstrumentSearch.vue`:
  - [ ] Componente de búsqueda/autocomplete
  - [ ] Para usar en formularios de trades (futuro)
  - [ ] Búsqueda en tiempo real con debounce
  - [ ] Mostrar resultados en dropdown

### 9. Rutas

- [x] Actualizar `frontend/src/router/index.ts`:
  - [x] `GET /instruments` → `InstrumentsListView` (name: 'Instruments')
  - [x] `GET /instruments/new` → `InstrumentFormView` (name: 'CreateInstrument')
  - [x] `GET /instruments/:id/edit` → `InstrumentFormView` (name: 'EditInstrument')
  - [x] Todas protegidas con `requiresAuth: true` y `requiresOnboarding: true`
- [x] Agregar enlaces en navegación:
  - [x] Agregar "Instrumentos" al navbar en `AppLayout.vue`
  - [x] Agregar acceso rápido desde Dashboard

### 10. Integración con Dashboard

- [x] Actualizar `DashboardView.vue`:
  - [x] Agregar card "Instrumentos" con:
    - [x] Total de instrumentos activos
    - [x] Enlace a lista de instrumentos
    - [x] Botón rápido "Crear Instrumento"

---

## 🧪 Tests

### 11. Tests Backend

#### 11.1 Unit Tests — InstrumentsService

- [x] Crear `backend/src/instruments/instruments.service.spec.ts`:
  - [x] Test `create`: Crear instrumento exitosamente
  - [x] Test `create`: Validar unicidad de ticker por usuario
  - [x] Test `create`: Validar normalización de symbol a uppercase
  - [x] Test `findAll`: Listar con filtros
  - [x] Test `findAll`: Paginación
  - [x] Test `findAll`: Búsqueda en name/symbol/ticker
  - [x] Test `findOne`: Obtener por ID
  - [x] Test `findOne`: Lanzar NotFoundException si no existe
  - [x] Test `findOne`: Validar propiedad (userId)
  - [x] Test `findByTicker`: Buscar por ticker
  - [x] Test `update`: Actualizar instrumento
  - [x] Test `update`: No permitir cambiar market y symbol
  - [x] Test `delete`: Soft delete (isActive = false)
  - [x] Test `search`: Búsqueda rápida con límite

#### 11.2 Integration Tests — InstrumentsController

- [x] Crear `backend/test/instruments.e2e-spec.ts`:
  - [x] Test `POST /instruments`: Crear instrumento
  - [x] Test `POST /instruments`: Validar duplicado de ticker
  - [x] Test `GET /instruments`: Listar instrumentos
  - [x] Test `GET /instruments`: Filtros (market, type, isActive)
  - [x] Test `GET /instruments`: Búsqueda (search query)
  - [x] Test `GET /instruments`: Paginación
  - [x] Test `GET /instruments/search`: Búsqueda rápida
  - [x] Test `GET /instruments/:id`: Obtener por ID
  - [x] Test `GET /instruments/ticker/:ticker`: Buscar por ticker
  - [x] Test `PATCH /instruments/:id`: Actualizar
  - [x] Test `DELETE /instruments/:id`: Soft delete
  - [x] Test acceso denegado: Usuario no puede acceder a instrumentos de otros

### 12. Tests Frontend

#### 12.1 Unit Tests — Components

- [x] Crear `frontend/src/views/__tests__/InstrumentsListView.spec.ts`:
  - [x] Renderizar lista de instrumentos
  - [x] Aplicar filtros
  - [x] Búsqueda
  - [x] Paginación
  - [x] Acciones (editar, eliminar)
- [x] Crear `frontend/src/views/__tests__/InstrumentFormView.spec.ts`:
  - [x] Validar formulario
  - [x] Crear instrumento
  - [x] Editar instrumento
  - [x] Validar ticker duplicado
  - [x] Normalización de symbol a uppercase
- [x] Crear `frontend/src/stores/__tests__/instruments.spec.ts`:
  - [x] Test de store: fetchInstruments
  - [x] Test de store: createInstrument
  - [x] Test de store: updateInstrument
  - [x] Test de store: deleteInstrument
  - [x] Test de store: searchInstruments

---

## 📚 Documentación

### 13. Documentación técnica

- [x] Documentar endpoints de API en Swagger:
  - [x] Endpoints de instruments
  - [x] Ejemplos de tickers por mercado
- [x] Actualizar `docs/DATABASE.md` con modelo Instrument
- [x] Documentar formato de ticker normalizado
- [x] Documentar reglas de negocio en README
- [x] Crear `docs/INSTRUMENTS.md` con:
  - [x] Formato de ticker: `MARKET:SYMBOL`
  - [x] Ejemplos por tipo de mercado
  - [x] Convenciones de naming
  - [x] Campos requeridos por tipo

---

## ✅ Checklist de Validación Final

- [ ] Todos los endpoints funcionan correctamente
- [ ] Validaciones de negocio implementadas
- [ ] Multi-tenant funcionando (usuario solo ve sus instrumentos)
- [ ] Ticker único por usuario
- [ ] Búsqueda y filtros funcionan
- [ ] Soft delete implementado
- [ ] Frontend completo con todas las pantallas
- [ ] Tests backend pasando
- [ ] Tests frontend pasando
- [ ] Documentación actualizada
- [ ] Swagger documentado
- [ ] Integración con navegación completa

---

## 🎯 Notas de Implementación

### Ticker Normalizado

El formato `MARKET:SYMBOL` permite:

- Identificar claramente el mercado y símbolo
- Evitar conflictos entre mercados (ej: BTCUSDT en Binance vs Coinbase)
- Facilitar reportes y análisis por mercado
- Mantener consistencia en todo el sistema

### Ejemplos de Tickers

- **Crypto**: `BINANCE:BTCUSDT`, `COINBASE:BTCUSD`, `KRAKEN:ETHUSD`
- **Stocks**: `NASDAQ:AAPL`, `NYSE:SPY`, `NYSE:TSLA`
- **ETFs**: `NYSE:SPY`, `NASDAQ:QQQ`, `NYSE:VTI`
- **Forex**: `FX:EURUSD`, `FX:GBPUSD`, `FX:USDJPY`
- **Futures**: `CME:ES`, `NYMEX:CL`, `ICE:BRENT`

### Campos Opcionales por Tipo

- **FOREX/FUTURES**: `contractSize` es altamente recomendado
- **Todos**: `tickSize` es útil para validaciones de precio
- **Todos**: `name` ayuda en reportes y visualización

---

**Estado del módulo:** 🟡 En progreso

**Progreso:**

- ✅ Backend completo (100%)
- ✅ Frontend básico completo (95% - componentes UI adicionales opcionales)
- ✅ Tests completos (100%)
- ✅ Documentación completa (100%)

# Trading OS Backend

Backend del Trading OS - Sistema de journal, portfolio y analytics para trading.

## Stack Tecnológico

- **NestJS** - Framework Node.js
- **TypeScript** - Lenguaje de programación
- **PostgreSQL** - Base de datos
- **Prisma** - ORM
- **Redis** - Cache y jobs (opcional)
- **JWT** - Autenticación con refresh tokens
- **Argon2** - Hashing de passwords

## Setup Inicial

### Prerrequisitos

- Node.js 18+ 
- Docker y Docker Compose
- npm o yarn

### Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus valores
```

3. Iniciar servicios con Docker Compose:
```bash
docker-compose up -d
```

4. Ejecutar migraciones de Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Iniciar servidor de desarrollo:
```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000/api`

## Scripts Disponibles

- `npm run start:dev` - Iniciar en modo desarrollo (watch)
- `npm run build` - Compilar para producción
- `npm run start:prod` - Iniciar en modo producción
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio (GUI para BD)
- `npm run test` - Ejecutar tests unitarios
- `npm run test:e2e` - Ejecutar tests end-to-end
- `npm run test:cov` - Ejecutar tests con coverage
- `npm run lint` - Ejecutar linter

## Estructura del Proyecto

```
src/
├── auth/           # Módulo de autenticación
├── users/          # Módulo de usuarios
├── accounts/       # Módulo de cuentas (extendido en Módulo B)
├── cashflows/      # Módulo de cashflows (Módulo B)
├── instruments/    # Módulo de instrumentos (Módulo C)
├── strategies/     # Módulo de estrategias (Módulo D)
├── setups/         # Módulo de setups (Módulo D)
├── rules/          # Módulo de reglas (Módulo D)
├── prisma/         # Servicio Prisma
└── main.ts         # Punto de entrada
```

## Documentación

### API (Swagger/OpenAPI)
La documentación interactiva de la API está disponible en:
- **Swagger UI**: `http://localhost:3000/api/docs` (solo en desarrollo)

Ver `docs/API.md` para documentación completa de endpoints.

### Base de Datos
Ver `docs/DATABASE.md` para documentación completa del schema y modelos.

### Cálculos y Métricas
Ver `docs/CALCULATIONS.md` para documentación completa de cómo se calculan equity, drawdown, rendimiento mensual y otras métricas.

### Instrumentos
Ver `docs/INSTRUMENTS.md` para documentación completa del catálogo de instrumentos, formato de ticker normalizado, convenciones y ejemplos.

### Estrategias, Setups y Reglas
Ver `docs/STRATEGIES.md` para documentación completa de estrategias, setups y reglas.

### Variables de Entorno
Ver `docs/ENVIRONMENT.md` para documentación completa de todas las variables de entorno.

## Endpoints API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Solicitar reset de contraseña
- `POST /api/auth/reset-password` - Resetear contraseña

### Usuarios
- `GET /api/users/me` - Obtener perfil del usuario autenticado
- `PATCH /api/users/me/settings` - Actualizar configuración

### Cuentas
- `POST /api/accounts` - Crear cuenta
- `GET /api/accounts` - Listar cuentas del usuario
- `GET /api/accounts/:id` - Obtener detalle de cuenta con métricas
- `PATCH /api/accounts/:id` - Actualizar cuenta
- `DELETE /api/accounts/:id` - Cerrar cuenta
- `POST /api/accounts/:id/snapshots/regenerate` - Regenerar snapshots históricos

### Cashflows
- `POST /api/cashflows` - Crear cashflow (depósito, retiro, ajuste, fee)
- `GET /api/cashflows` - Listar cashflows con filtros y paginación
- `GET /api/cashflows/timeline` - Obtener timeline de cashflows
- `GET /api/cashflows/account/:accountId/total` - Obtener total de cashflows por cuenta
- `GET /api/cashflows/:id` - Obtener cashflow por ID
- `PATCH /api/cashflows/:id` - Actualizar cashflow
- `DELETE /api/cashflows/:id` - Eliminar cashflow

### Instrumentos
- `POST /api/instruments` - Crear instrumento
- `GET /api/instruments` - Listar instrumentos con filtros y paginación
- `GET /api/instruments/search` - Búsqueda rápida (autocomplete)
- `GET /api/instruments/ticker/:ticker` - Buscar por ticker normalizado
- `GET /api/instruments/:id` - Obtener instrumento por ID
- `PATCH /api/instruments/:id` - Actualizar instrumento
- `DELETE /api/instruments/:id` - Eliminar instrumento (soft delete)

### Estrategias
- `POST /api/strategies` - Crear estrategia
- `GET /api/strategies` - Listar estrategias con filtros y paginación
- `GET /api/strategies/:id` - Obtener estrategia por ID
- `GET /api/strategies/:id/setups` - Listar setups de una estrategia
- `PATCH /api/strategies/:id` - Actualizar estrategia
- `DELETE /api/strategies/:id` - Eliminar estrategia (soft delete)

### Setups
- `POST /api/setups` - Crear setup
- `GET /api/setups` - Listar setups con filtros y paginación
- `GET /api/setups/strategy/:strategyId` - Listar setups de una estrategia
- `GET /api/setups/:id` - Obtener setup por ID con reglas
- `PATCH /api/setups/:id` - Actualizar setup
- `DELETE /api/setups/:id` - Eliminar setup (soft delete)

### Reglas
- `POST /api/rules` - Crear regla
- `GET /api/rules` - Listar reglas con filtros
- `GET /api/rules/setup/:setupId` - Listar reglas de un setup ordenadas
- `GET /api/rules/:id` - Obtener regla por ID
- `PATCH /api/rules/:id` - Actualizar regla
- `PATCH /api/rules/reorder` - Reordenar reglas de un setup
- `DELETE /api/rules/:id` - Eliminar regla (soft delete)

Para ver la base de datos con Prisma Studio:

```bash
npm run prisma:studio
```

## Desarrollo

El proyecto sigue una arquitectura modular de NestJS. Cada módulo tiene:
- `*.module.ts` - Definición del módulo
- `*.service.ts` - Lógica de negocio
- `*.controller.ts` - Endpoints REST
- `dto/` - Data Transfer Objects para validación

## Testing

El proyecto incluye tests unitarios y E2E:

- **Tests unitarios**: Prueban servicios individuales con mocks
- **Tests E2E**: Prueban endpoints completos con base de datos real
- **Tests de validación**: Prueban validación de DTOs

Ver `TESTING.md` para más detalles sobre cómo ejecutar y escribir tests.

## Reglas de Negocio

### Cuentas

1. **Multi-tenant**: Cada usuario solo puede acceder a sus propias cuentas
2. **Estados**: Las cuentas pueden estar ACTIVE, INACTIVE o CLOSED
3. **Cierre**: Al cerrar una cuenta, se establece `status = CLOSED` y `closedAt = now()` (soft delete)
4. **Balance**: El balance se calcula automáticamente: `initialBalance + sum(cashflows)`
5. **Moneda**: Cada cuenta tiene una moneda base (USD, COP, etc.)

### Cashflows

1. **Tipos**: DEPOSIT (suma), WITHDRAWAL (resta), ADJUSTMENT (suma), FEE (resta)
2. **Moneda**: La moneda del cashflow debe coincidir con la moneda de la cuenta
3. **Monto**: Siempre positivo (> 0), el tipo determina si suma o resta
4. **Fecha**: No puede ser futura (validación configurable)
5. **Propiedad**: El usuario solo puede crear cashflows en sus propias cuentas
6. **Balance automático**: Al crear/actualizar/eliminar un cashflow, se actualiza el balance de la cuenta

### Métricas

1. **Equity**: `currentBalance + totalRealizedPnL` (por ahora igual al balance hasta que haya trades)
2. **Drawdown**: `((peakEquity - currentEquity) / peakEquity) * 100`
3. **Rendimiento Mensual**: `((endEquity - startEquity) / startEquity) * 100`
4. **Snapshots**: Se generan automáticamente cada día a las 00:00 para todas las cuentas activas

### Separación Trading vs Capital

El sistema separa claramente:
- **Movimientos de capital** (cashflows): Depósitos, retiros, ajustes, fees
- **Ganancias/pérdidas de trading** (PnL): Resultados de operaciones (a implementar en módulos futuros)

```
Balance = initialBalance + cashflows
Equity = Balance + realizedPnL + unrealizedPnL
```

Ver `docs/CALCULATIONS.md` para más detalles sobre los cálculos.

### Instrumentos

1. **Ticker normalizado**: Formato `MARKET:SYMBOL` (ej: `BINANCE:BTCUSDT`, `NASDAQ:AAPL`)
2. **Multi-mercado**: Soporta CRYPTO, STOCK, ETF, FOREX, FUTURES, OPTIONS
3. **Unicidad**: El ticker debe ser único por usuario (multi-tenant)
4. **Normalización**: Market y symbol se normalizan automáticamente a uppercase
5. **Soft delete**: No se eliminan físicamente, solo se marca `isActive = false`
6. **Inmutabilidad**: Market y symbol no se pueden cambiar después de crear
7. **Campos recomendados**: `contractSize` para FOREX/FUTURES, `tickSize` para todos

Ver `docs/INSTRUMENTS.md` para más detalles sobre el formato de ticker, convenciones y ejemplos.

### Estrategias, Setups y Reglas

1. **Jerarquía**: Strategy → Setup → Rule (estructura jerárquica flexible)
2. **Estrategias**:
   - Multi-tenant: Cada usuario solo puede acceder a sus propias estrategias
   - Soft delete: No se eliminan físicamente, solo se marca `isActive = false`
   - Campos opcionales: `targetMarket` y `typicalTimeframe` son opcionales
   - Una estrategia puede tener múltiples setups asociados
3. **Setups**:
   - Pueden existir sin estrategia asociada (`strategyId = null`)
   - Multi-tenant: Cada usuario solo puede acceder a sus propios setups
   - Soft delete: No se eliminan físicamente, solo se marca `isActive = false`
   - Tags sugeridos: Array de strings para identificar el setup
   - Si se elimina una estrategia, los setups asociados quedan sin estrategia
4. **Reglas**:
   - Siempre deben estar asociadas a un setup (`setupId` obligatorio)
   - Ordenamiento: Se ordenan por `order` y luego por `createdAt`
   - Reglas requeridas: `isRequired = true` indica que la regla es obligatoria
   - Soft delete: No se eliminan físicamente, solo se marca `isActive = false`
   - Si se elimina un setup, se eliminan todas sus reglas (Cascade)
   - Reordenamiento: Se puede cambiar el orden de las reglas dentro de un setup

Ver `docs/STRATEGIES.md` para más detalles sobre estrategias, setups y reglas.

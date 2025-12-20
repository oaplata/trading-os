# Checklist Módulo D — Estrategias, Setups y Reglas (El Cerebro del Journal)

## 📋 Resumen del Módulo

**Objetivo:** Crear un sistema de gestión de estrategias, setups y reglas que permita clasificar trades, medir performance por setup y evaluar cumplimiento de disciplina. Este módulo es fundamental para el journal de trading.

**Decisión de diseño:**

- **Estrategias**: Agrupación de alto nivel (ej: "Swing Trading Crypto", "Day Trading Stocks")
- **Setups**: Patrones específicos dentro de una estrategia (ej: "Breakout", "Pullback", "Reversal")
- **Reglas**: Checklist de validación por setup (sí/no) para medir disciplina

**Pantallas:**

1. Lista de Estrategias (con detalle)
2. Formulario de Crear/Editar Estrategia
3. Lista de Setups (con filtros por estrategia)
4. Formulario de Crear/Editar Setup
5. Gestión de Reglas por Setup (checklist)

**Stack relevante:**

- Backend: NestJS + PostgreSQL + Prisma
- Frontend: Vue 3 + TypeScript + Tailwind CSS
- UI: Tema oscuro por defecto, diseño minimalista tipo terminal

---

## 🔧 Backend

### 1. Base de datos — Schema Prisma

#### 1.1 Modelo Strategy

- [x] Crear modelo `Strategy` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User, para multi-tenant)
  - [x] `name` (String, nombre de la estrategia, ej: "Swing Trading Crypto")
  - [x] `description` (String, nullable, descripción detallada)
  - [x] `targetMarket` (String, nullable, mercado objetivo, ej: "CRYPTO", "STOCKS", "FOREX")
  - [x] `typicalTimeframe` (String, nullable, timeframe típico, ej: "1H", "4H", "1D", "1W")
  - [x] `isActive` (Boolean, default: true, para soft delete)
  - [x] `notes` (String, nullable, notas adicionales)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 1.2 Modelo Setup

- [x] Crear modelo `Setup` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User, para multi-tenant)
  - [x] `strategyId` (UUID, foreign key a Strategy, nullable)
  - [x] `name` (String, nombre del setup, ej: "Breakout", "Pullback", "Reversal")
  - [x] `description` (String, nullable, descripción del setup)
  - [x] `suggestedTags` (String[], array de tags sugeridos, ej: ["breakout", "momentum"])
  - [x] `isActive` (Boolean, default: true, para soft delete)
  - [x] `notes` (String, nullable, notas adicionales)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 1.3 Modelo Rule

- [x] Crear modelo `Rule` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User, para multi-tenant)
  - [x] `setupId` (UUID, foreign key a Setup)
  - [x] `name` (String, nombre de la regla, ej: "Price above EMA 20")
  - [x] `description` (String, nullable, descripción de la regla)
  - [x] `order` (Int, orden de la regla en el checklist, default: 0)
  - [x] `isRequired` (Boolean, default: false, si es obligatoria)
  - [x] `isActive` (Boolean, default: true, para soft delete)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 1.4 Índices y Relaciones

- [x] Índices para Strategy:
  - [x] `userId` (indexado)
  - [x] `targetMarket` (indexado)
  - [x] `isActive` (indexado)
  - [x] `userId, targetMarket` (compuesto, indexado)
- [x] Índices para Setup:
  - [x] `userId` (indexado)
  - [x] `strategyId` (indexado)
  - [x] `isActive` (indexado)
  - [x] `userId, strategyId` (compuesto, indexado)
- [x] Índices para Rule:
  - [x] `userId` (indexado)
  - [x] `setupId` (indexado)
  - [x] `order` (indexado)
  - [x] `isActive` (indexado)
  - [x] `userId, setupId` (compuesto, indexado)
- [x] Relaciones:
  - [x] `Strategy.user` → User (N:1, onDelete: Cascade)
  - [x] `Strategy.setups` → Setup (1:N, onDelete: Cascade)
  - [x] `Setup.user` → User (N:1, onDelete: Cascade)
  - [x] `Setup.strategy` → Strategy (N:1, onDelete: SetNull)
  - [x] `Setup.rules` → Rule (1:N, onDelete: Cascade)
  - [x] `Rule.user` → User (N:1, onDelete: Cascade)
  - [x] `Rule.setup` → Setup (N:1, onDelete: Cascade)

### 2. Migraciones Prisma

- [x] Crear migración para modelos Strategy, Setup, Rule
- [x] Aplicar migración en desarrollo
- [x] Verificar índices y relaciones

### 3. DTOs (Data Transfer Objects)

#### 3.1 Strategy DTOs

- [x] Crear `dto/create-strategy.dto.ts`:
  - [x] `name` (string, required, min 1, max 100)
  - [x] `description` (string, optional, max 1000)
  - [x] `targetMarket` (string, optional, max 50)
  - [x] `typicalTimeframe` (string, optional, max 20)
  - [x] `notes` (string, optional, max 2000)
- [x] Crear `dto/update-strategy.dto.ts`:
  - [x] Todos los campos opcionales (PartialType)
- [x] Crear `dto/strategy-response.dto.ts`:
  - [x] Todos los campos del modelo + `setupCount` (número de setups asociados)
- [x] Crear `dto/strategy-list-query.dto.ts`:
  - [x] `targetMarket` (string, optional)
  - [x] `search` (string, optional)
  - [x] `isActive` (boolean, optional)
  - [x] `page` (number, optional, default: 1)
  - [x] `limit` (number, optional, default: 50)

#### 3.2 Setup DTOs

- [x] Crear `dto/create-setup.dto.ts`:
  - [x] `strategyId` (UUID, optional)
  - [x] `name` (string, required, min 1, max 100)
  - [x] `description` (string, optional, max 1000)
  - [x] `suggestedTags` (string[], optional, max 20 items)
  - [x] `notes` (string, optional, max 2000)
- [x] Crear `dto/update-setup.dto.ts`:
  - [x] Todos los campos opcionales (PartialType)
- [x] Crear `dto/setup-response.dto.ts`:
  - [x] Todos los campos del modelo + `ruleCount` (número de reglas)
  - [x] `strategy` (StrategyResponseDto, optional, si tiene strategyId)
- [x] Crear `dto/setup-list-query.dto.ts`:
  - [x] `strategyId` (UUID, optional)
  - [x] `search` (string, optional)
  - [x] `isActive` (boolean, optional)
  - [x] `page` (number, optional, default: 1)
  - [x] `limit` (number, optional, default: 50)

#### 3.3 Rule DTOs

- [x] Crear `dto/create-rule.dto.ts`:
  - [x] `setupId` (UUID, required)
  - [x] `name` (string, required, min 1, max 200)
  - [x] `description` (string, optional, max 500)
  - [x] `order` (number, optional, default: 0)
  - [x] `isRequired` (boolean, optional, default: false)
- [x] Crear `dto/update-rule.dto.ts`:
  - [x] Todos los campos opcionales (PartialType)
  - [x] `setupId` no se puede cambiar (validar)
- [x] Crear `dto/rule-response.dto.ts`:
  - [x] Todos los campos del modelo
- [x] Crear `dto/rule-list-query.dto.ts`:
  - [x] `setupId` (UUID, optional)
  - [x] `isRequired` (boolean, optional)
  - [x] `isActive` (boolean, optional)
- [x] Crear `dto/reorder-rules.dto.ts`:
  - [x] `setupId` (UUID, required)
  - [x] `ruleIds` (string[], required, array de IDs en orden deseado)

### 4. Services

#### 4.1 StrategiesService

- [x] Crear `strategies.service.ts`:
  - [x] `create(userId, createDto)`: Crear estrategia
  - [x] `findAll(userId, query)`: Listar con filtros y paginación
  - [x] `findOne(id, userId)`: Obtener por ID con validación de propiedad
  - [x] `update(id, userId, updateDto)`: Actualizar estrategia
  - [x] `delete(id, userId)`: Soft delete (isActive = false)
  - [x] `getSetupCount(id, userId)`: Contar setups asociados
  - [x] Validaciones:
    - [x] Unicidad de nombre por usuario (opcional, permitir duplicados)
    - [x] Validar propiedad en todas las operaciones

#### 4.2 SetupsService

- [x] Crear `setups.service.ts`:
  - [x] `create(userId, createDto)`: Crear setup
  - [x] `findAll(userId, query)`: Listar con filtros y paginación
  - [x] `findOne(id, userId)`: Obtener por ID con reglas ordenadas
  - [x] `update(id, userId, updateDto)`: Actualizar setup
  - [x] `delete(id, userId)`: Soft delete (isActive = false)
  - [x] `findByStrategy(strategyId, userId)`: Listar setups de una estrategia
  - [x] `getRuleCount(id, userId)`: Contar reglas asociadas
  - [x] Validaciones:
    - [x] Validar que strategyId existe y pertenece al usuario (si se proporciona)
    - [x] Validar propiedad en todas las operaciones

#### 4.3 RulesService

- [x] Crear `rules.service.ts`:
  - [x] `create(userId, createDto)`: Crear regla
  - [x] `findAll(userId, query)`: Listar con filtros (ordenadas por `order`)
  - [x] `findOne(id, userId)`: Obtener por ID
  - [x] `update(id, userId, updateDto)`: Actualizar regla
  - [x] `delete(id, userId)`: Soft delete (isActive = false)
  - [x] `findBySetup(setupId, userId)`: Listar reglas de un setup (ordenadas)
  - [x] `reorder(userId, reorderDto)`: Reordenar reglas
  - [x] Validaciones:
    - [x] Validar que setupId existe y pertenece al usuario
    - [x] Validar propiedad en todas las operaciones
    - [x] Ordenar por `order` y luego por `createdAt`

### 5. Controllers

#### 5.1 StrategiesController

- [x] Crear `strategies.controller.ts`:
  - [x] `POST /strategies`: Crear estrategia
  - [x] `GET /strategies`: Listar con filtros y paginación
  - [x] `GET /strategies/:id`: Obtener por ID
  - [x] `PATCH /strategies/:id`: Actualizar estrategia
  - [x] `DELETE /strategies/:id`: Eliminar estrategia (soft delete)
  - [x] `GET /strategies/:id/setups`: Listar setups de una estrategia
  - [x] Swagger documentation:
    - [x] `@ApiTags('strategies')`
    - [x] `@ApiOperation` en cada endpoint
    - [x] `@ApiResponse` para cada status code
    - [x] `@ApiQuery` para parámetros de query

#### 5.2 SetupsController

- [x] Crear `setups.controller.ts`:
  - [x] `POST /setups`: Crear setup
  - [x] `GET /setups`: Listar con filtros y paginación
  - [x] `GET /setups/:id`: Obtener por ID con reglas
  - [x] `PATCH /setups/:id`: Actualizar setup
  - [x] `DELETE /setups/:id`: Eliminar setup (soft delete)
  - [x] `GET /setups/strategy/:strategyId`: Listar setups de una estrategia
  - [x] Swagger documentation:
    - [x] `@ApiTags('setups')`
    - [x] `@ApiOperation` en cada endpoint
    - [x] `@ApiResponse` para cada status code
    - [x] `@ApiQuery` para parámetros de query

#### 5.3 RulesController

- [x] Crear `rules.controller.ts`:
  - [x] `POST /rules`: Crear regla
  - [x] `GET /rules`: Listar con filtros (ordenadas)
  - [x] `GET /rules/:id`: Obtener por ID
  - [x] `PATCH /rules/:id`: Actualizar regla
  - [x] `DELETE /rules/:id`: Eliminar regla (soft delete)
  - [x] `GET /rules/setup/:setupId`: Listar reglas de un setup (ordenadas)
  - [x] `PATCH /rules/reorder`: Reordenar reglas de un setup
  - [x] Swagger documentation:
    - [x] `@ApiTags('rules')`
    - [x] `@ApiOperation` en cada endpoint
    - [x] `@ApiResponse` para cada status code
    - [x] `@ApiQuery` para parámetros de query

### 6. Módulos NestJS

- [x] Crear `strategies.module.ts`:
  - [x] Importar `PrismaModule`
  - [x] Exportar `StrategiesService`
  - [x] Declarar `StrategiesController`
- [x] Crear `setups.module.ts`:
  - [x] Importar `PrismaModule`
  - [x] Exportar `SetupsService`
  - [x] Declarar `SetupsController`
- [x] Crear `rules.module.ts`:
  - [x] Importar `PrismaModule`
  - [x] Exportar `RulesService`
  - [x] Declarar `RulesController`
- [x] Actualizar `app.module.ts`:
  - [x] Importar `StrategiesModule`
  - [x] Importar `SetupsModule`
  - [x] Importar `RulesModule`
- [x] Actualizar `main.ts`:
  - [x] Agregar tag `strategies` a Swagger
  - [x] Agregar tag `setups` a Swagger
  - [x] Agregar tag `rules` a Swagger

---

## 🎨 Frontend

### 7. Types TypeScript

- [x] Actualizar `src/types/index.ts`:
  - [x] Agregar interface `Strategy`:
    - [x] `id`, `userId`, `name`, `description`, `targetMarket`, `typicalTimeframe`, `isActive`, `notes`, `createdAt`, `updatedAt`
  - [x] Agregar interface `Setup`:
    - [x] `id`, `userId`, `strategyId`, `name`, `description`, `suggestedTags`, `isActive`, `notes`, `createdAt`, `updatedAt`
  - [x] Agregar interface `Rule`:
    - [x] `id`, `userId`, `setupId`, `name`, `description`, `order`, `isRequired`, `isActive`, `createdAt`, `updatedAt`
  - [x] Agregar DTOs: `CreateStrategyDto`, `UpdateStrategyDto`, `StrategyListQuery`
  - [x] Agregar DTOs: `CreateSetupDto`, `UpdateSetupDto`, `SetupListQuery`
  - [x] Agregar DTOs: `CreateRuleDto`, `UpdateRuleDto`, `RuleListQuery`, `ReorderRulesDto`

### 8. Stores Pinia

#### 8.1 Strategies Store

- [x] Crear `src/stores/strategies.ts`:
  - [x] State:
    - [x] `strategies` (array)
    - [x] `selectedStrategy` (Strategy | null)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
    - [x] `filters` (StrategyListQuery)
    - [x] `pagination` (meta)
  - [x] Getters:
    - [x] `activeStrategies` (filtrar por isActive)
    - [x] `strategiesByMarket` (agrupar por targetMarket)
  - [x] Actions:
    - [x] `fetchStrategies(query?)`
    - [x] `fetchStrategy(id)`
    - [x] `createStrategy(dto)`
    - [x] `updateStrategy(id, dto)`
    - [x] `deleteStrategy(id)`

#### 8.2 Setups Store

- [x] Crear `src/stores/setups.ts`:
  - [x] State:
    - [x] `setups` (array)
    - [x] `selectedSetup` (Setup | null)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
    - [x] `filters` (SetupListQuery)
    - [x] `pagination` (meta)
  - [x] Getters:
    - [x] `activeSetups` (filtrar por isActive)
    - [x] `setupsByStrategy` (agrupar por strategyId)
  - [x] Actions:
    - [x] `fetchSetups(query?)`
    - [x] `fetchSetup(id)`
    - [x] `fetchSetupsByStrategy(strategyId)`
    - [x] `createSetup(dto)`
    - [x] `updateSetup(id, dto)`
    - [x] `deleteSetup(id)`

#### 8.3 Rules Store

- [x] Crear `src/stores/rules.ts`:
  - [x] State:
    - [x] `rules` (array)
    - [x] `selectedRule` (Rule | null)
    - [x] `loading` (boolean)
    - [x] `error` (string | null)
  - [x] Getters:
    - [x] `activeRules` (filtrar por isActive)
    - [x] `rulesBySetup` (agrupar por setupId, ordenadas)
    - [x] `requiredRules` (filtrar por isRequired)
  - [x] Actions:
    - [x] `fetchRules(query?)`
    - [x] `fetchRule(id)`
    - [x] `fetchRulesBySetup(setupId)`
    - [x] `createRule(dto)`
    - [x] `updateRule(id, dto)`
    - [x] `deleteRule(id)`
    - [x] `reorderRules(setupId, ruleIds)`

### 9. Vistas (Views)

#### 9.1 Estrategias

- [x] Crear `src/views/StrategiesListView.vue`:
  - [x] Lista de estrategias con tabla
  - [x] Filtros: targetMarket, search, isActive
  - [x] Búsqueda en nombre y descripción
  - [x] Paginación
  - [x] Acciones: crear, editar, eliminar
  - [x] Mostrar contador de setups por estrategia
- [x] Crear `src/views/StrategyFormView.vue`:
  - [x] Formulario de crear/editar estrategia
  - [x] Campos: name, description, targetMarket, typicalTimeframe, notes
  - [x] Validación de campos requeridos
  - [x] Modo creación vs edición
- [ ] Crear `src/views/StrategyDetailView.vue` (opcional):
  - [ ] Detalle de estrategia
  - [ ] Lista de setups asociados
  - [ ] Estadísticas (a implementar en módulos futuros)

#### 9.2 Setups

- [x] Crear `src/views/SetupsListView.vue`:
  - [x] Lista de setups con tabla
  - [x] Filtros: strategyId, search, isActive
  - [x] Búsqueda en nombre y descripción
  - [x] Paginación
  - [x] Acciones: crear, editar, eliminar, ver detalle
  - [x] Mostrar estrategia asociada (si tiene)
  - [x] Mostrar contador de reglas por setup
- [x] Crear `src/views/SetupFormView.vue`:
  - [x] Formulario de crear/editar setup
  - [x] Campos: strategyId (select), name, description, suggestedTags (input con tags), notes
  - [x] Validación de campos requeridos
  - [x] Modo creación vs edición
- [x] Crear `src/views/SetupDetailView.vue`:
  - [x] Detalle de setup
  - [x] Lista de reglas (checklist) ordenadas
  - [x] Gestión de reglas (agregar, editar, eliminar)
  - [ ] Reordenar reglas (drag & drop opcional para futuro)
  - [ ] Vista de checklist para usar en trades (futuro)

#### 9.3 Reglas

- [ ] Crear `src/views/RulesListView.vue` (opcional, si se necesita vista independiente):
  - [ ] Lista de reglas con filtros
- [x] Gestión de reglas integrada en SetupDetailView:
  - [x] Formulario modal para crear/editar regla
  - [x] Campos: name, description, order, isRequired
  - [x] Lista ordenada de reglas
- [ ] Crear `src/components/rules/RuleList.vue` (opcional):
  - [ ] Lista de reglas ordenadas (drag & drop opcional)
  - [ ] Checkboxes para marcar cumplimiento (para uso futuro en trades)
  - [ ] Indicador de reglas requeridas

### 10. Rutas

- [x] Actualizar `src/router/index.ts`:
  - [x] Ruta `/strategies` → StrategiesListView
  - [x] Ruta `/strategies/new` → StrategyFormView
  - [x] Ruta `/strategies/:id/edit` → StrategyFormView
  - [ ] Ruta `/strategies/:id` → StrategyDetailView (opcional, no implementado)
  - [x] Ruta `/setups` → SetupsListView
  - [x] Ruta `/setups/new` → SetupFormView
  - [x] Ruta `/setups/:id/edit` → SetupFormView
  - [x] Ruta `/setups/:id` → SetupDetailView
  - [x] Todas protegidas con `requiresAuth` y `requiresOnboarding`

### 11. Navegación

- [x] Actualizar `src/components/layout/AppLayout.vue`:
  - [x] Agregar link "Estrategias" en navbar
  - [x] Agregar link "Setups" en navbar
- [x] Actualizar `src/views/DashboardView.vue`:
  - [x] Agregar card de acceso rápido a Estrategias
  - [x] Agregar card de acceso rápido a Setups
  - [x] Mostrar resumen de estrategias y setups

---

## 🧪 Tests

### 12. Tests Backend

#### 12.1 Unit Tests — StrategiesService

- [x] Crear `backend/src/strategies/strategies.service.spec.ts`:
  - [x] Test `create`: Crear estrategia exitosamente
  - [x] Test `findAll`: Listar con filtros
  - [x] Test `findAll`: Paginación
  - [x] Test `findAll`: Búsqueda
  - [x] Test `findOne`: Obtener por ID
  - [x] Test `findOne`: Lanzar NotFoundException si no existe
  - [x] Test `findOne`: Validar propiedad (userId)
  - [x] Test `update`: Actualizar estrategia
  - [x] Test `delete`: Soft delete (isActive = false)
  - [x] Test `getSetupCount`: Contar setups asociados

#### 12.2 Unit Tests — SetupsService

- [x] Crear `backend/src/setups/setups.service.spec.ts`:
  - [x] Test `create`: Crear setup exitosamente
  - [x] Test `create`: Validar strategyId si se proporciona
  - [x] Test `findAll`: Listar con filtros
  - [x] Test `findByStrategy`: Listar setups de una estrategia
  - [x] Test `findOne`: Obtener por ID con reglas ordenadas
  - [x] Test `update`: Actualizar setup
  - [x] Test `delete`: Soft delete

#### 12.3 Unit Tests — RulesService

- [x] Crear `backend/src/rules/rules.service.spec.ts`:
  - [x] Test `create`: Crear regla exitosamente
  - [x] Test `create`: Validar setupId
  - [x] Test `findAll`: Listar ordenadas por order
  - [x] Test `findBySetup`: Listar reglas de un setup (ordenadas)
  - [x] Test `update`: Actualizar regla
  - [x] Test `delete`: Soft delete
  - [x] Test `reorder`: Reordenar reglas

#### 12.4 Integration Tests — Controllers

- [x] Crear `backend/test/strategies.e2e-spec.ts`:
  - [x] Test `POST /strategies`: Crear estrategia
  - [x] Test `GET /strategies`: Listar estrategias
  - [x] Test `GET /strategies/:id`: Obtener por ID
  - [x] Test `PATCH /strategies/:id`: Actualizar
  - [x] Test `DELETE /strategies/:id`: Soft delete
  - [x] Test `GET /strategies/:id/setups`: Listar setups
  - [x] Test acceso denegado: Usuario no puede acceder a estrategias de otros
  - ⚠️ Nota: Tests E2E requieren ajustes de configuración de base de datos
- [x] Crear `backend/test/setups.e2e-spec.ts`:
  - [x] Test `POST /setups`: Crear setup
  - [x] Test `GET /setups`: Listar setups
  - [x] Test `GET /setups/:id`: Obtener por ID con reglas
  - [x] Test `PATCH /setups/:id`: Actualizar
  - [x] Test `DELETE /setups/:id`: Soft delete
  - [x] Test `GET /setups/strategy/:strategyId`: Listar por estrategia
  - [x] Test acceso denegado
  - ⚠️ Nota: Tests E2E requieren ajustes de configuración de base de datos
- [x] Crear `backend/test/rules.e2e-spec.ts`:
  - [x] Test `POST /rules`: Crear regla
  - [x] Test `GET /rules`: Listar reglas
  - [x] Test `GET /rules/setup/:setupId`: Listar por setup
  - [x] Test `PATCH /rules/:id`: Actualizar
  - [x] Test `DELETE /rules/:id`: Soft delete
  - [x] Test `PATCH /rules/reorder`: Reordenar reglas
  - [x] Test acceso denegado
  - ⚠️ Nota: Tests E2E requieren ajustes de configuración de base de datos

### 13. Tests Frontend

#### 13.1 Unit Tests — Components

- [ ] Crear `frontend/src/views/__tests__/StrategiesListView.spec.ts`:
  - [ ] Renderizar lista de estrategias
  - [ ] Aplicar filtros
  - [ ] Búsqueda
  - [ ] Paginación
- [ ] Crear `frontend/src/views/__tests__/StrategyFormView.spec.ts`:
  - [ ] Validar formulario
  - [ ] Crear estrategia
  - [ ] Editar estrategia
- [ ] Crear `frontend/src/views/__tests__/SetupsListView.spec.ts`:
  - [ ] Renderizar lista de setups
  - [ ] Filtrar por estrategia
  - [ ] Búsqueda
- [ ] Crear `frontend/src/views/__tests__/SetupFormView.spec.ts`:
  - [ ] Validar formulario
  - [ ] Crear setup
  - [ ] Editar setup
- [ ] Crear `frontend/src/views/__tests__/SetupDetailView.spec.ts`:
  - [ ] Mostrar reglas ordenadas
  - [ ] Agregar regla
  - [ ] Editar regla
  - [ ] Reordenar reglas

#### 13.2 Unit Tests — Stores

- [x] Crear `frontend/src/stores/__tests__/strategies.spec.ts`:
  - [x] Test de store: fetchStrategies
  - [x] Test de store: createStrategy
  - [x] Test de store: updateStrategy
  - [x] Test de store: deleteStrategy
  - [x] Test de getters: activeStrategies, strategiesByMarket
- [x] Crear `frontend/src/stores/__tests__/setups.spec.ts`:
  - [x] Test de store: fetchSetups
  - [x] Test de store: createSetup
  - [x] Test de store: updateSetup
  - [x] Test de store: fetchSetupsByStrategy
  - [x] Test de getters: activeSetups
- [x] Crear `frontend/src/stores/__tests__/rules.spec.ts`:
  - [x] Test de store: fetchRules
  - [x] Test de store: createRule
  - [x] Test de store: updateRule
  - [x] Test de store: reorderRules
  - [x] Test de getters: activeRules, requiredRules

---

## 📚 Documentación

### 14. Documentación técnica

- [x] Documentar endpoints de API en Swagger:
  - [x] Endpoints de strategies (decoradores @ApiOperation, @ApiResponse en controllers)
  - [x] Endpoints de setups (decoradores @ApiOperation, @ApiResponse en controllers)
  - [x] Endpoints de rules (decoradores @ApiOperation, @ApiResponse en controllers)
  - [x] Ejemplos de uso en docs/STRATEGIES.md
- [x] Actualizar `docs/DATABASE.md` con modelos Strategy, Setup, Rule
- [x] Documentar reglas de negocio en README
- [x] Crear `docs/STRATEGIES.md` con:
  - [x] Concepto de estrategias, setups y reglas
  - [x] Relación entre entidades
  - [x] Casos de uso
  - [x] Ejemplos de estrategias y setups comunes
  - [x] Mejores prácticas
  - [x] Documentación completa de API endpoints
  - [x] Ejemplos de código

---

## ✅ Checklist de Validación Final

- [ ] Todos los endpoints funcionan correctamente
- [ ] Validaciones de negocio implementadas
- [ ] Multi-tenant funcionando (usuario solo ve sus estrategias/setups/reglas)
- [ ] Soft delete funcionando
- [ ] Búsqueda y filtros funcionan
- [ ] Paginación funcionando
- [ ] Ordenamiento de reglas funcionando
- [ ] Reordenamiento de reglas funcionando
- [ ] Relaciones entre entidades funcionando
- [ ] Tests pasando (backend y frontend)
- [ ] Documentación completa
- [ ] Swagger actualizado

---

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **Setups sin estrategia**: Un setup puede existir sin estar asociado a una estrategia (strategyId nullable)
2. **Reglas ordenadas**: Las reglas tienen un campo `order` para controlar el orden del checklist
3. **Tags sugeridos**: Los setups tienen `suggestedTags` como array de strings para facilitar búsqueda y clasificación
4. **Soft delete**: Todas las entidades usan soft delete para preservar datos históricos
5. **Multi-tenant**: Todas las entidades están aisladas por usuario

### Integración Futura

- Este módulo se integrará con el Módulo E (Operaciones/Trades):
  - Al crear un trade, se selecciona estrategia y setup
  - Al cerrar un trade, se evalúa el checklist de reglas
  - Se mide performance por estrategia y setup
  - Se mide cumplimiento de reglas (disciplina)

---

**Progreso:**

- ✅ Backend completo (100%)
- ✅ Frontend básico completo (100%)
- ✅ Tests backend unitarios completos (100%)
- ✅ Tests frontend stores completos (100%)
- ⏳ Tests E2E (estructura completa, requiere ajustes de configuración)
- ✅ Documentación completa (100%)

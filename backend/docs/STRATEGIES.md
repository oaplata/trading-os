# Documentación de Estrategias, Setups y Reglas

## Resumen

El Módulo D implementa un sistema jerárquico para organizar estrategias de trading, setups específicos y reglas de checklist. Esta estructura permite a los traders organizar su metodología de trading de manera estructurada y reutilizable.

## Estructura Jerárquica

```
Strategy (Estrategia)
  └── Setup (Patrón de Trading)
        └── Rule (Regla del Checklist)
```

### Niveles

1. **Strategy (Estrategia)**: Nivel más alto, representa una metodología de trading completa
   - Ejemplo: "Swing Trading Crypto", "Day Trading Stocks", "Scalping Forex"
   
2. **Setup (Patrón)**: Patrón específico dentro de una estrategia
   - Ejemplo: "Breakout", "Pullback", "Reversal", "Momentum"
   - Puede existir sin estrategia asociada
   
3. **Rule (Regla)**: Checklist de disciplina para evaluar un setup
   - Ejemplo: "Price above EMA 20", "Volume > 1.5x average", "RSI < 70"
   - Siempre debe estar asociada a un setup

## Modelos de Datos

### Strategy

**Campos:**
- `id`: UUID (PK)
- `userId`: UUID (FK a User, multi-tenant)
- `name`: String (requerido) - Nombre de la estrategia
- `description`: String? (opcional) - Descripción detallada
- `targetMarket`: String? (opcional) - Mercado objetivo (ej: "CRYPTO", "STOCKS", "FOREX")
- `typicalTimeframe`: String? (opcional) - Timeframe típico (ej: "4H", "1D", "1W")
- `isActive`: Boolean (default: true) - Soft delete
- `notes`: String? (opcional) - Notas adicionales
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `setups` → Setup[] (1:N, onDelete: SetNull)

**Índices:**
- `userId` (indexado)
- `targetMarket` (indexado)
- `isActive` (indexado)
- `userId, targetMarket` (compuesto)

### Setup

**Campos:**
- `id`: UUID (PK)
- `userId`: UUID (FK a User, multi-tenant)
- `strategyId`: UUID? (FK a Strategy, opcional)
- `name`: String (requerido) - Nombre del setup
- `description`: String? (opcional) - Descripción del setup
- `suggestedTags`: String[] (array) - Tags sugeridos para identificar el setup
- `isActive`: Boolean (default: true) - Soft delete
- `notes`: String? (opcional) - Notas adicionales
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `strategy` → Strategy? (N:1, onDelete: SetNull)
- `rules` → Rule[] (1:N, onDelete: Cascade)

**Índices:**
- `userId` (indexado)
- `strategyId` (indexado)
- `isActive` (indexado)
- `userId, strategyId` (compuesto)

### Rule

**Campos:**
- `id`: UUID (PK)
- `userId`: UUID (FK a User, multi-tenant)
- `setupId`: UUID (FK a Setup, requerido)
- `name`: String (requerido) - Nombre de la regla
- `description`: String? (opcional) - Descripción de la regla
- `order`: Int (default: 0) - Orden en el checklist
- `isRequired`: Boolean (default: false) - Si la regla es obligatoria
- `isActive`: Boolean (default: 1) - Soft delete
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Relaciones:**
- `user` → User (N:1, onDelete: Cascade)
- `setup` → Setup (N:1, onDelete: Cascade)

**Índices:**
- `userId` (indexado)
- `setupId` (indexado)
- `order` (indexado)
- `isActive` (indexado)
- `userId, setupId` (compuesto)

## Reglas de Negocio

### Estrategias

1. **Multi-tenant**: Cada usuario solo puede acceder a sus propias estrategias
2. **Soft delete**: No se eliminan físicamente, solo se marca `isActive = false`
3. **Campos opcionales**: `targetMarket` y `typicalTimeframe` son opcionales
4. **Setups asociados**: Una estrategia puede tener múltiples setups
5. **Eliminación**: Si se elimina una estrategia, los setups asociados quedan sin estrategia (`strategyId = null`)

### Setups

1. **Independencia**: Pueden existir sin estrategia asociada (`strategyId = null`)
2. **Multi-tenant**: Cada usuario solo puede acceder a sus propios setups
3. **Soft delete**: No se eliminan físicamente, solo se marca `isActive = false`
4. **Tags**: Array de strings para identificar y categorizar setups
5. **Validación de estrategia**: Si se proporciona `strategyId`, debe existir y pertenecer al usuario
6. **Eliminación de estrategia**: Si se elimina una estrategia, el setup queda sin estrategia pero se mantiene

### Reglas

1. **Asociación obligatoria**: Siempre deben estar asociadas a un setup (`setupId` requerido)
2. **Ordenamiento**: Se ordenan por `order` (ascendente) y luego por `createdAt` (ascendente)
3. **Reglas requeridas**: `isRequired = true` indica que la regla es obligatoria
4. **Soft delete**: No se eliminan físicamente, solo se marca `isActive = false`
5. **Validación de setup**: El `setupId` debe existir y pertenecer al usuario
6. **Eliminación de setup**: Si se elimina un setup, se eliminan todas sus reglas (Cascade)
7. **Reordenamiento**: Se puede cambiar el orden de las reglas dentro de un setup
8. **Inmutabilidad de setup**: No se puede cambiar el `setupId` de una regla después de crearla

## API Endpoints

### Estrategias

#### Crear Estrategia
```http
POST /api/strategies
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Swing Trading Crypto",
  "description": "Estrategia de swing trading enfocada en criptomonedas",
  "targetMarket": "CRYPTO",
  "typicalTimeframe": "4H",
  "notes": "Notas adicionales"
}
```

#### Listar Estrategias
```http
GET /api/strategies?page=1&limit=50&targetMarket=CRYPTO&search=swing&isActive=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 50)
- `targetMarket`: Filtrar por mercado objetivo
- `search`: Búsqueda en nombre y descripción
- `isActive`: Filtrar por estado activo/inactivo

#### Obtener Estrategia
```http
GET /api/strategies/:id
Authorization: Bearer {token}
```

**Respuesta incluye:**
- Información de la estrategia
- `setupCount`: Número de setups asociados

#### Listar Setups de una Estrategia
```http
GET /api/strategies/:id/setups
Authorization: Bearer {token}
```

#### Actualizar Estrategia
```http
PATCH /api/strategies/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "targetMarket": "STOCKS"
}
```

#### Eliminar Estrategia (Soft Delete)
```http
DELETE /api/strategies/:id
Authorization: Bearer {token}
```

### Setups

#### Crear Setup
```http
POST /api/setups
Authorization: Bearer {token}
Content-Type: application/json

{
  "strategyId": "strategy-id",  // Opcional
  "name": "Breakout",
  "description": "Setup de breakout cuando el precio rompe resistencia",
  "suggestedTags": ["breakout", "momentum"],
  "notes": "Notas adicionales"
}
```

#### Listar Setups
```http
GET /api/setups?page=1&limit=50&strategyId=xxx&search=breakout&isActive=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 50)
- `strategyId`: Filtrar por estrategia
- `search`: Búsqueda en nombre y descripción
- `isActive`: Filtrar por estado activo/inactivo

#### Listar Setups de una Estrategia
```http
GET /api/setups/strategy/:strategyId
Authorization: Bearer {token}
```

#### Obtener Setup
```http
GET /api/setups/:id
Authorization: Bearer {token}
```

**Respuesta incluye:**
- Información del setup
- `strategy`: Estrategia asociada (si existe)
- `rules`: Lista de reglas ordenadas (solo activas)
- `ruleCount`: Número total de reglas

#### Actualizar Setup
```http
PATCH /api/setups/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Breakout",
  "suggestedTags": ["breakout", "updated"]
}
```

#### Eliminar Setup (Soft Delete)
```http
DELETE /api/setups/:id
Authorization: Bearer {token}
```

### Reglas

#### Crear Regla
```http
POST /api/rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "setupId": "setup-id",
  "name": "Price above EMA 20",
  "description": "El precio debe estar por encima de la EMA 20",
  "order": 0,
  "isRequired": false
}
```

#### Listar Reglas
```http
GET /api/rules?setupId=xxx&isRequired=true&isActive=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `setupId`: Filtrar por setup
- `isRequired`: Filtrar por reglas requeridas
- `isActive`: Filtrar por estado activo/inactivo

**Nota:** Las reglas se devuelven ordenadas por `order` y luego por `createdAt`.

#### Listar Reglas de un Setup
```http
GET /api/rules/setup/:setupId
Authorization: Bearer {token}
```

**Respuesta:** Lista de reglas ordenadas (solo activas)

#### Obtener Regla
```http
GET /api/rules/:id
Authorization: Bearer {token}
```

#### Actualizar Regla
```http
PATCH /api/rules/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Rule",
  "order": 1,
  "isRequired": true
}
```

**Nota:** No se puede cambiar el `setupId` de una regla.

#### Reordenar Reglas
```http
PATCH /api/rules/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
  "setupId": "setup-id",
  "ruleIds": ["rule-1-id", "rule-2-id", "rule-3-id"]
}
```

**Nota:** El orden de `ruleIds` determina el nuevo orden. Todas las reglas deben pertenecer al mismo setup.

#### Eliminar Regla (Soft Delete)
```http
DELETE /api/rules/:id
Authorization: Bearer {token}
```

## Ejemplos de Uso

### Ejemplo 1: Crear una Estrategia Completa

```javascript
// 1. Crear estrategia
const strategy = await api.post('/strategies', {
  name: 'Swing Trading Crypto',
  description: 'Estrategia de swing trading en criptomonedas',
  targetMarket: 'CRYPTO',
  typicalTimeframe: '4H'
});

// 2. Crear setup asociado
const setup = await api.post('/setups', {
  strategyId: strategy.id,
  name: 'Breakout',
  description: 'Setup de breakout cuando el precio rompe resistencia',
  suggestedTags: ['breakout', 'momentum']
});

// 3. Crear reglas del checklist
await api.post('/rules', {
  setupId: setup.id,
  name: 'Price above EMA 20',
  order: 0,
  isRequired: true
});

await api.post('/rules', {
  setupId: setup.id,
  name: 'Volume > 1.5x average',
  order: 1,
  isRequired: true
});

await api.post('/rules', {
  setupId: setup.id,
  name: 'RSI < 70',
  order: 2,
  isRequired: false
});
```

### Ejemplo 2: Setup Independiente

```javascript
// Crear setup sin estrategia
const setup = await api.post('/setups', {
  name: 'Pullback',
  description: 'Setup de pullback en cualquier mercado',
  suggestedTags: ['pullback', 'retracement']
});

// Agregar reglas
await api.post('/rules', {
  setupId: setup.id,
  name: 'Price retraces to support',
  order: 0
});
```

### Ejemplo 3: Reordenar Reglas

```javascript
// Obtener reglas actuales
const rules = await api.get(`/rules/setup/${setupId}`);

// Reordenar (invertir orden)
const reorderedIds = rules.map(r => r.id).reverse();

await api.patch('/rules/reorder', {
  setupId: setupId,
  ruleIds: reorderedIds
});
```

## Casos de Uso

### 1. Organización de Metodología
- Crear estrategias de alto nivel (ej: "Swing Trading", "Day Trading")
- Agrupar setups específicos dentro de cada estrategia
- Definir checklists de disciplina para cada setup

### 2. Reutilización de Setups
- Crear setups independientes que pueden usarse en múltiples contextos
- Asociar setups a estrategias cuando sea apropiado
- Compartir setups entre diferentes estrategias (cambiando `strategyId`)

### 3. Evaluación de Disciplina
- Usar reglas como checklist antes de entrar en un trade
- Marcar reglas requeridas como obligatorias
- Reordenar reglas según prioridad

### 4. Análisis y Mejora
- Revisar qué setups funcionan mejor dentro de cada estrategia
- Identificar reglas que se cumplen frecuentemente vs. las que no
- Ajustar estrategias y setups basándose en resultados

## Mejores Prácticas

1. **Nomenclatura Clara**: Usa nombres descriptivos para estrategias, setups y reglas
2. **Descripciones Detalladas**: Proporciona descripciones claras para facilitar el entendimiento
3. **Tags Útiles**: Usa tags sugeridos para facilitar la búsqueda y categorización
4. **Orden Lógico**: Ordena las reglas de manera lógica (de más importante a menos importante)
5. **Reglas Requeridas**: Marca como requeridas solo las reglas críticas
6. **Timeframes Consistentes**: Usa formatos consistentes para `typicalTimeframe` (ej: "4H", "1D", "1W")
7. **Mercados Específicos**: Especifica `targetMarket` cuando la estrategia es específica de un mercado

## Notas Técnicas

- **Soft Delete**: Todas las entidades usan soft delete (`isActive = false`) en lugar de eliminación física
- **Multi-tenant**: Todos los datos están aislados por usuario (`userId`)
- **Cascade Delete**: Si se elimina un setup, se eliminan todas sus reglas
- **SetNull Delete**: Si se elimina una estrategia, los setups asociados quedan sin estrategia
- **Ordenamiento**: Las reglas se ordenan automáticamente por `order` y `createdAt`
- **Validación**: Todas las relaciones se validan antes de crear/actualizar

## Integración con Otros Módulos

Este módulo se integra con:
- **Módulo C (Instrumentos)**: Los setups pueden referenciar instrumentos específicos en el futuro
- **Módulos Futuros (Trades)**: Las reglas se usarán como checklist al evaluar trades
- **Módulos Futuros (Analytics)**: Las estrategias y setups se usarán para análisis de performance


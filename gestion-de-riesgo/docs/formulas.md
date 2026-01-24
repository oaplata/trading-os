# Documentación de Fórmulas - Gestión de Riesgo (v2)

Este documento explica todas las fórmulas utilizadas en el sistema extendido con estados avanzados, eventos y toma de ganancias parciales.

## 📋 Estados de Operación

Los estados válidos son:

- **ABIERTA**: Operación abierta con riesgo. **SOLO estas suman al Riesgo Global**.
- **BREAKEVEN**: Operación abierta sin riesgo (stop movido a entrada). No suma al Riesgo Global.
- **PARCIAL**: Operación con al menos una toma parcial, y aún queda parte abierta.
- **STOPLOSS**: Operación cerrada por stop (resultado final negativo).
- **CERRADA**: Operación cerrada por target final (resultado final positivo).
- **CERRADA_BREAKEVEN**: Operación que subió a BE pero terminó cerrando en entrada (0).

**Regla importante:** Solo operaciones con `status == "ABIERTA"` suman al Riesgo Global.

## 📐 Fórmulas por Operación

### 1. Tamaño Restante (`remainingSizeUsd`)

El tamaño restante se calcula restando los tamaños cerrados en eventos:

```
remainingSizeUsd = positionSizeUsd - SUM(sizeUsd de eventos PARTIAL_TP y FINAL_TP)
remainingSizeUsd = max(0, remainingSizeUsd)  // No puede ser negativo
```

**Ejemplo:**
- Tamaño inicial: $10,000
- Evento PARTIAL_TP: $3,000
- Tamaño restante: $10,000 - $3,000 = $7,000

---

### 2. Riesgo en USD (`riskUsd`)

**Solo se calcula si `status == "ABIERTA"`**. Si el estado es diferente, `riskUsd = 0` para el resumen.

**LONG:**
```
riskUsd = abs((entryPrice - stopPrice) / entryPrice) * remainingSizeUsd
```

**SHORT:**
```
riskUsd = abs((stopPrice - entryPrice) / entryPrice) * remainingSizeUsd
```

**Ejemplo (LONG):**
- Entrada: $50,000
- Stop: $48,000
- Tamaño restante: $7,000
- Riesgo: abs((50,000 - 48,000) / 50,000) * 7,000 = $280

**Nota:** `remainingSizeUsd` se usa en lugar de `positionSizeUsd` para reflejar solo el riesgo del tamaño aún abierto.

---

### 3. Ganancias Realizadas (`totalRealizedUsd`)

Se calcula basado en **eventos** que cierran tamaño (PARTIAL_TP, FINAL_TP, STOPLOSS, CLOSE_BE).

Para cada evento que cierra tamaño:
- **LONG:** `pnl = (price/entryPrice - 1) * sizeUsd`
- **SHORT:** `pnl = (entryPrice/price - 1) * sizeUsd`

```
totalRealizedUsd = SUM(pnl de todos los eventos que cierran tamaño)
```

**Ejemplo (LONG con parciales):**
- Entrada: $50,000
- Evento 1 (PARTIAL_TP): price=$52,000, size=$3,000
  - PnL: ((52,000/50,000) - 1) * 3,000 = $120
- Evento 2 (FINAL_TP): price=$53,000, size=$7,000
  - PnL: ((53,000/50,000) - 1) * 7,000 = $420
- Total Realizado: $120 + $420 = $540

---

### 4. Ganancias Flotantes (`totalFloatingUsd`)

Solo se calcula si:
- `remainingSizeUsd > 0`
- `status` es `ABIERTA`, `BREAKEVEN` o `PARCIAL`
- `currentPrice` existe

**LONG:**
```
totalFloatingUsd = ((currentPrice / entryPrice) - 1) * remainingSizeUsd
```

**SHORT:**
```
totalFloatingUsd = ((entryPrice / currentPrice) - 1) * remainingSizeUsd
```

**Ejemplo (LONG PARCIAL):**
- Entrada: $50,000
- Precio Actual: $51,000
- Tamaño restante: $7,000
- Ganancia Flotante: ((51,000 / 50,000) - 1) * 7,000 = $140

**Nota:** Si `currentPrice` está vacío, `totalFloatingUsd = 0` y se muestra warning.

---

## 📊 Fórmulas del Resumen

### 5. Ganancias Realizadas Totales

Suma de todas las ganancias realizadas (de todas las operaciones, cerradas o parciales):

```
totalRealizedUsd = SUM(totalRealizedUsd) de todas las operaciones
```

### 6. Ganancias Realizadas (%)

Porcentaje sobre el capital inicial:

```
realizedPercentage = (totalRealizedUsd / initialCapital) * 100
```

### 7. Capitalizado

Capital inicial más ganancias realizadas:

```
capitalized = initialCapital + totalRealizedUsd
```

### 8. Ganancias Flotantes Totales

Suma de ganancias flotantes de operaciones con `remainingSizeUsd > 0`:

```
totalFloatingUsd = SUM(totalFloatingUsd) de operaciones con remainingSizeUsd > 0
```

### 9. Ganancias Flotantes (%)

Porcentaje sobre el capitalizado:

```
floatingPercentage = (totalFloatingUsd / capitalized) * 100
```

### 10. Capital Flotante

Capitalizado más ganancias flotantes:

```
floatingCapital = capitalized + totalFloatingUsd
```

### 11. Riesgo Global (USD)

**SOLO** de operaciones con `status == "ABIERTA"`:

```
totalRiskUsd = SUM(riskUsd) de operaciones donde status = "ABIERTA"
```

**Nota:** Operaciones en BREAKEVEN, PARCIAL, STOPLOSS, CERRADA o CERRADA_BREAKEVEN NO suman al riesgo global.

### 12. Riesgo Global (%)

Porcentaje sobre el capitalizado:

```
riskPercentage = (totalRiskUsd / capitalized) * 100
```

---

## 🎯 Eventos y Determinación de Estado

El estado de una operación se determina automáticamente basado en sus eventos:

1. **Si último evento es STOPLOSS → `STOPLOSS`**
2. **Si último evento es FINAL_TP → `CERRADA`**
3. **Si último evento es CLOSE_BE → `CERRADA_BREAKEVEN`**
4. **Si hay MOVE_TO_BE y `remainingSizeUsd > 0` → `BREAKEVEN`**
5. **Si hay PARTIAL_TP y `remainingSizeUsd > 0` → `PARCIAL`**
6. **Si no hay eventos → `ABIERTA`**

### Tipos de Eventos

- **PARTIAL_TP**: Toma parcial de ganancias. Requiere `price` y `sizeUsd`.
- **FINAL_TP**: Cierre final en target. Requiere `price` y `sizeUsd` (debe ser `remainingSizeUsd`).
- **STOPLOSS**: Cierre por stop loss. Requiere `price` (stopPrice) y `sizeUsd` (debe ser `remainingSizeUsd`).
- **MOVE_TO_BE**: Mover stop a breakeven (entrada). No cierra tamaño.
- **CLOSE_BE**: Cerrar en breakeven (entrada). Requiere `price` (entryPrice) y `sizeUsd`.
- **MANUAL_ADJUST**: Ajuste manual (opcional).

---

## 🔄 Lógica de Cálculo

### Orden de Ejecución

1. **Cargar eventos** de cada operación (desde Firestore subcolección `events/`)
2. **Calcular `remainingSizeUsd`** basado en eventos PARTIAL_TP y FINAL_TP
3. **Determinar estado** automáticamente basado en eventos
4. **Por cada operación:**
   - Calcular `riskUsd` (solo si status == ABIERTA)
   - Calcular `totalRealizedUsd` (suma de PnL de eventos)
   - Calcular `totalFloatingUsd` (solo si remainingSizeUsd > 0 y status abierto)

5. **Para el resumen:**
   - Sumar `totalRealizedUsd` de todas las operaciones
   - Sumar `totalFloatingUsd` de operaciones con remainingSizeUsd > 0
   - Sumar `riskUsd` de operaciones con status == ABIERTA
   - Calcular porcentajes sobre `capitalized`

### Consideraciones

- **Valores por defecto:** Si algún campo requerido falta, el cálculo retorna 0.
- **División por cero:** Se valida que denominadores > 0 antes de calcular porcentajes.
- **Valores negativos:** Las ganancias pueden ser negativas (pérdidas). El riesgo siempre es positivo.
- **Estado automático:** El estado se actualiza automáticamente al agregar/editar eventos.

---

## 🧪 Ejemplos Prácticos

### Ejemplo 1: Operación LONG con toma parcial

```
symbol: "BTCUSDT"
direction: "LONG"
entryPrice: 50000
stopPrice: 48000
positionSizeUsd: 10000

Eventos:
1. PARTIAL_TP: date="2024-01-15", price=52000, sizeUsd=3000

Cálculos:
- remainingSizeUsd = 10000 - 3000 = 7000
- status = PARCIAL (hay PARTIAL_TP y remaining > 0)
- riskUsd = 0 (status != ABIERTA)
- totalRealizedUsd = ((52000/50000) - 1) * 3000 = $120
- totalFloatingUsd = (currentPrice/50000 - 1) * 7000 (si hay currentPrice)
```

### Ejemplo 2: Mover a Breakeven

```
Operación: BTCUSDT LONG, entry=50000, stop=48000

Eventos:
1. MOVE_TO_BE: date="2024-01-20"

Estado: BREAKEVEN
remainingSizeUsd = 10000 (no cambia)
riskUsd = 0 (status != ABIERTA, no suma al riesgo global)
```

### Ejemplo 3: Cierre final en Target

```
Operación: BTCUSDT LONG con PARCIAL

Eventos:
1. PARTIAL_TP: price=52000, sizeUsd=3000
2. FINAL_TP: price=53000, sizeUsd=7000

Cálculos:
- remainingSizeUsd = 10000 - 3000 - 7000 = 0
- status = CERRADA (último evento es FINAL_TP)
- totalRealizedUsd = ((52000/50000)-1)*3000 + ((53000/50000)-1)*7000 = $120 + $420 = $540
```

---

## 📚 Referencias

- Las fórmulas están implementadas en `src/stores/operationsStore.js`
- Los eventos se gestionan en `src/services/events.js`
- Los cálculos son reactivos gracias a Vue 3 Composition API
- Todos los valores se redondean a 2 decimales para visualización
- Los eventos se almacenan en Firestore subcolección `users/{uid}/operations/{opId}/events/{eventId}`

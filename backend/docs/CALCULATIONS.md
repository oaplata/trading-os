# Documentación de Cálculos - Trading OS

Este documento describe los cálculos y métricas implementados en el Módulo B del Trading OS.

## Balance de Cuenta

### Cálculo de Balance Actual

El balance actual de una cuenta se calcula como:

```
currentBalance = initialBalance + sum(cashflows)
```

Donde:
- `initialBalance`: Balance inicial configurado al crear la cuenta
- `cashflows`: Suma de todos los cashflows, donde:
  - `DEPOSIT` y `ADJUSTMENT` se suman (positivos)
  - `WITHDRAWAL` y `FEE` se restan (negativos)

**Ejemplo:**
```
initialBalance = 1000
cashflows:
  - DEPOSIT: +500
  - WITHDRAWAL: -200
  - ADJUSTMENT: +100
  - FEE: -50

currentBalance = 1000 + 500 - 200 + 100 - 50 = 1350
```

### Actualización Automática

El balance se actualiza automáticamente cuando:
1. Se crea un nuevo cashflow
2. Se actualiza un cashflow existente
3. Se elimina un cashflow

## Equity

### Definición

El equity representa el valor real de la cuenta, incluyendo tanto el capital como las ganancias/pérdidas realizadas.

### Cálculo

```
equity = currentBalance + totalRealizedPnL
```

Donde:
- `currentBalance`: Balance actual calculado
- `totalRealizedPnL`: Suma de todas las ganancias/pérdidas realizadas desde trades (por ahora 0, hasta que se implemente el módulo de trades)

**Nota:** En el Módulo B, `totalRealizedPnL` es 0 porque aún no hay trades. El equity será igual al balance hasta que se implemente el módulo de trading.

**Ejemplo:**
```
currentBalance = 1350
totalRealizedPnL = 0 (sin trades aún)

equity = 1350 + 0 = 1350
```

## Drawdown

### Definición

El drawdown representa la pérdida desde el pico máximo de equity alcanzado.

### Cálculo

```
drawdown = ((peakEquity - currentEquity) / peakEquity) * 100
```

Donde:
- `peakEquity`: El equity más alto registrado en los snapshots históricos
- `currentEquity`: El equity actual de la cuenta

Si no hay snapshots históricos, el drawdown es 0.

**Ejemplo:**
```
peakEquity = 2000 (del snapshot más alto)
currentEquity = 1800

drawdown = ((2000 - 1800) / 2000) * 100 = 10%
```

### Snapshots

Los snapshots se generan automáticamente cada día a medianoche (00:00) mediante un job programado. Cada snapshot guarda:
- `equity`: Equity al cierre del día
- `balance`: Balance al cierre del día
- `realizedPnL`: PnL realizado acumulado
- `unrealizedPnL`: PnL no realizado (si aplica)
- `drawdown`: Drawdown calculado al momento del snapshot

## Rendimiento Mensual

### Definición

El rendimiento mensual representa el porcentaje de ganancia/pérdida en un mes específico.

### Cálculo

```
monthlyReturn = ((endEquity - startEquity) / startEquity) * 100
```

Donde:
- `startEquity`: Equity al inicio del mes (primer snapshot del mes o equity inicial)
- `endEquity`: Equity al final del mes (último snapshot del mes o equity actual)

Si `startEquity` es 0 o negativo, el rendimiento es 0.

**Ejemplo:**
```
startEquity = 1000 (1 de enero)
endEquity = 1100 (31 de enero)

monthlyReturn = ((1100 - 1000) / 1000) * 100 = 10%
```

### Mes Actual

Para el mes actual, se usa:
- `startEquity`: Primer snapshot del mes o equity inicial si no hay snapshots
- `endEquity`: Equity actual (no snapshot, valor en tiempo real)

## Total de Cashflows

### Cálculo

```
totalCashflows = sum(DEPOSIT) + sum(ADJUSTMENT) - sum(WITHDRAWAL) - sum(FEE)
```

Es la suma neta de todos los movimientos de capital.

**Ejemplo:**
```
DEPOSIT: +1000
ADJUSTMENT: +200
WITHDRAWAL: -300
FEE: -50

totalCashflows = 1000 + 200 - 300 - 50 = 850
```

## Separación Trading PnL vs Movimientos de Dinero

### Principio

El sistema separa claramente:
1. **Movimientos de capital** (cashflows): Depósitos, retiros, ajustes, fees
2. **Ganancias/pérdidas de trading** (PnL): Resultados de operaciones de trading

### Balance vs Equity

- **Balance**: Representa solo el capital (dinero real en la cuenta)
- **Equity**: Representa el capital + ganancias/pérdidas de trading

```
Balance = initialBalance + cashflows
Equity = Balance + realizedPnL + unrealizedPnL
```

### Ejemplo Completo

```
Cuenta inicial:
  initialBalance = 1000

Movimientos de capital:
  DEPOSIT: +500
  WITHDRAWAL: -200
  Balance = 1000 + 500 - 200 = 1300

Trading:
  Realized PnL: +300
  Unrealized PnL: +100
  
Equity = 1300 + 300 + 100 = 1700
```

## Snapshots Diarios

### Generación Automática

Un job programado (`SnapshotsSchedulerService`) genera snapshots diarios a las 00:00 para todas las cuentas activas.

### Contenido del Snapshot

Cada snapshot guarda:
- `date`: Fecha del snapshot
- `equity`: Equity al cierre
- `balance`: Balance al cierre
- `realizedPnL`: PnL realizado acumulado
- `unrealizedPnL`: PnL no realizado (si aplica)
- `drawdown`: Drawdown calculado

### Regeneración Histórica

Se puede regenerar snapshots históricos mediante:
```
POST /accounts/:id/snapshots/regenerate?startDate=2024-01-01&endDate=2024-12-31
```

Esto es útil cuando:
- Se agregan trades históricos
- Se corrigen cashflows pasados
- Se necesita reconstruir métricas históricas

## Validaciones y Reglas de Negocio

### Cashflows

1. **Moneda**: La moneda del cashflow debe coincidir con la moneda de la cuenta
2. **Monto**: El monto debe ser positivo (> 0)
3. **Fecha**: La fecha no puede ser futura (validación opcional, configurable)
4. **Propiedad**: El usuario solo puede crear cashflows en sus propias cuentas

### Cuentas

1. **Propiedad**: El usuario solo puede acceder a sus propias cuentas
2. **Cierre**: Al cerrar una cuenta, se establece `status = CLOSED` y `closedAt = now()`
3. **Balance**: El balance se recalcula automáticamente al modificar cashflows

### Snapshots

1. **Unicidad**: Solo puede haber un snapshot por cuenta y fecha
2. **Orden**: Los snapshots se ordenan por fecha para cálculos históricos
3. **Integridad**: Si se elimina una cuenta, se eliminan todos sus snapshots (cascade)

## Notas de Implementación

### Precisión Decimal

Todos los cálculos monetarios usan `Decimal` de Prisma para evitar problemas de precisión de punto flotante.

### Performance

- Los snapshots se generan en batch para todas las cuentas
- Los índices en la base de datos optimizan las consultas por fecha y cuenta
- El balance se calcula on-demand, no se guarda en caché (siempre actualizado)

### Escalabilidad

- Los snapshots históricos se pueden regenerar en paralelo por cuenta
- Las consultas de métricas usan índices compuestos para eficiencia
- El cálculo de drawdown usa el snapshot más reciente con el equity más alto


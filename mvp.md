## Visión del producto

Un **Trading OS** (journal + portfolio + analytics) donde registras operaciones con **múltiples entradas y múltiples salidas (parciales)**, fees, slippage, notas, screenshots y tags; y obtienes un **dashboard** con evolución del capital, drawdowns, métricas, rachas, performance por mercado/estrategia/setup, y reportes exportables.

### Principios de diseño

- **Real-life primero:** todo se modela como _fills_ (ejecuciones), no como “una entrada y una salida”.
- **Plan vs Real:** siempre existe la intención (plan) y lo ejecutado (fills).
- **Multi-mercado nativo:** cripto, acciones, ETFs, forex (con normalización).
- **R y riesgo como primera clase:** R-multiple, riesgo planificado y riesgo real.
- **Velocidad de registro:** crear una operación en < 60 segundos.

---

# 1) Módulos y pantallas del sistema

## Módulo A — Autenticación y configuración inicial

### Pantallas

1. **Login / Register**

- Email + password
- Recuperación de contraseña
- 2FA (no en MVP, pero dejamos preparado)

2. **Onboarding (wizard)**

- Zona horaria (default: America/Bogota)
- Moneda base de reporting (COP / USD; default USD)
- Crear primera **Cuenta** (ej: “Binance Futures”, “IBKR”, “Forex Live”)
- Elegir si trabajas con “riesgo %” por defecto (ej: 1%)

### Casos de uso

- Crear usuario y entrar
- Configurar cuenta(s)
- Definir defaults para acelerar el registro de trades

---

## Módulo B — Cuentas, capital y cashflows

### Objetivo

Controlar el “mundo real”: depósitos, retiros, fees externos, ajustes.

### Pantallas

1. **Cuentas**

- Lista de cuentas con: moneda, broker/exchange, tipo (Spot/Futures/CFD), estado
- Detalle de cuenta: equity actual, balance, DD, rendimiento mensual

2. **Cashflows**

- Registrar depósito/retiro/ajuste (ej: comisiones mensuales, suscripciones)
- Vista timeline y filtros

### Casos de uso

- Crear cuenta por mercado (crypto, stocks, forex)
- Registrar depósitos/retiros que afectan equity curve
- Separar resultados de trading vs movimientos de dinero

---

## Módulo C — Catálogo de instrumentos (multi-mercado)

### Decisión

Usaremos un **ticker normalizado**:
`MARKET:SYMBOL`
Ejemplos:

- `BINANCE:BTCUSDT`
- `NASDAQ:AAPL`
- `NYSE:SPY`
- `FX:EURUSD`

### Pantallas

1. **Instrumentos**

- Buscar/crear instrumento
- Campos: market, symbol, name, currency_quote, tick_size, contract_size (forex), tipo (crypto/stock/etf/forex)

### Casos de uso

- Registrar instrumentos rápidamente sin depender de integraciones
- Mantener consistencia en reportes por símbolo

---

## Módulo D — Estrategias, setups y reglas (el cerebro del journal)

### Pantallas

1. **Estrategias**

- Lista + detalle
- Campos: nombre, descripción, mercado objetivo, timeframe típico

2. **Setups**

- Catálogo de setups (ej: Breakout, Pullback, Reversal)
- Campos: nombre, checklist de reglas, tags sugeridos

3. **Reglas (Checklists)**

- Checklist por setup (sí/no)
- Se usa en el cierre para medir disciplina

### Casos de uso

- Clasificar trades por estrategia/setup
- Medir performance por setup
- Medir cumplimiento de reglas

---

## Módulo E — Operaciones (Trade Lifecycle) ✅ MVP con parciales

Este es el módulo principal.

### Decisión de modelo

Todo trade tiene:

- **TradePlan** (intención)
- **Executions/Fills** (real)
- **Estado**: Planned → Open → Closed / Canceled

### Pantallas

1. **Trades – Lista**

- Tabla con filtros: cuenta, mercado, símbolo, estrategia, setup, fechas, resultado, tags, estado
- Columnas clave: open_time, close_time, net PnL, R, fees, #fills, cumplimiento checklist, notas
- Acciones rápidas: duplicar trade, cerrar trade, exportar

2. **Nuevo Trade (Plan)**
   Campos:

- Account
- Instrument (MARKET:SYMBOL)
- Side (LONG/SHORT)
- Tipo de operación (Spot/Margin/Futures/Options más adelante)
- Timeframe (opcional)
- **Planned entry** (opcional si es escalado)
- **Planned SL** (obligatorio para calcular riesgo)
- Planned TPs (lista)
- Risk: % o $ (default %)
- Tamaño planificado (opcional)
- Estrategia / setup / tags
- Thesis (texto)
- Adjuntos: screenshot URL (o upload en fase 2)

Botón: **“Abrir Trade”** (lo pasa a Open y habilita fills)

3. **Trade Detalle (Ejecución)**
   Secciones:

- Resumen: símbolo, side, estado, duración, PnL neto, R, fees, avg entry/exit
- Plan (editable si aún no cerró, con versionado simple)
- **Fills timeline** (tabla)
- Gestión de parciales:

  - Add Entry Fill (qty, price, fee, datetime)
  - Add Exit Fill (qty, price, fee, datetime)
  - Add Fee/Adjustment (financing, funding, comisiones)

- Posición viva:

  - Qty abierta
  - Avg entry
  - Break-even price
  - Unrealized PnL (opcional MVP si no hay integración; se puede calcular si tú lo ingresas)

- Checklist (en cierre)
- Post-trade review

4. **Cerrar Trade (Modal)**

- Confirmación de que qty abierta = 0
- Checklist de reglas (sí/no)
- Clasificación de resultado: Win/Loss/BE
- Emoción (opcional): calm/neutral/anxious/greedy
- Lección aprendida (texto)
- Guardar

### Casos de uso (realistas)

- Escalar entrada: 3 entradas en diferentes precios
- Salir en parciales: 4 salidas (TP1, TP2, trailing, cierre final)
- Fee/funding diario en futures
- Ajuste por swap en forex
- Trade que se cancela antes de ejecutar (Planned → Canceled)
- Trade reabierto (no en MVP: se clona)

---

## Módulo F — Dashboard (visión ejecutiva)

### Pantalla: Dashboard principal

Widgets (decisión: estos son MVP):

1. **Equity Curve (línea)**

- por fecha (daily) usando trades cerrados + cashflows

2. **Drawdown Curve (línea)**

- max DD y DD actual

3. **KPIs**

- Net PnL, % return, winrate, profit factor, expectancy
- Avg R, best/worst trade, # trades

4. **Monthly performance (heatmap)**
5. **Distribución de R (histograma)**
6. **Top/Worst setups**
7. **Performance por mercado**

- crypto vs stocks vs etf vs forex

### Casos de uso

- Ver si la cuenta mejora con el tiempo
- Detectar si un setup está degradándose
- Ver si un mercado te está drenando

---

## Módulo G — Reportes (modo auditoría)

### Pantallas

1. **Reporte de Trades**

- Tabla avanzada + export CSV/XLSX
- Filtros guardables (ej: “Solo AAPL”, “Solo Forex Londres”)

2. **Reporte por Estrategia/Setup**

- KPIs por setup
- Equity curve por setup

3. **Reporte por Símbolo**

- KPIs, distribución de R, frecuencia

4. **Sesiones y calendario**

- Días de la semana y horas (si registras time)
- (MVP: por día de semana / mes)

### Casos de uso

- Encontrar setups con mejor expectancy
- Encontrar horas/días donde peor operas
- Preparar un reporte mensual

---

## Módulo H — Importación y exportación

### Decisión

MVP con **importador CSV “universal”** con mapeo de columnas.

### Pantallas

1. **Import CSV**

- Subir archivo
- Mapear columnas: symbol, market, side, qty, price, fee, datetime, type(entry/exit/fee), account
- Previsualización
- Validación (errores y warnings)
- Importar

2. **Export**

- Export trades (resumen)
- Export fills (detalle)

---

# 2) Cálculos y métricas (definiciones operativas)

## PnL neto por trade

- PnL bruto: sumatoria de (salidas - entradas) \* qty según side
- Fees: suma de fees en fills + ajustes
- Net PnL = bruto - fees - ajustes

## R-multiple (decisión)

- R se define por **riesgo planificado inicial**:

  - `Risk$ = |PlannedEntryReference - PlannedSL| * planned_position_size`

- Como hay parciales/escala, para MVP:

  - “PlannedEntryReference” = promedio de entradas planificadas (si existen) o primera entrada real.

- `R = NetPnL / Risk$`

> Esto te da consistencia para comparar trades incluso con escalado.

## Equity curve (decisión)

- Se construye día a día:

  - Equity(t) = Equity(t-1) + sum(NetPnL de trades cerrados ese día) + cashflows del día

---

# 3) Línea gráfica (UI/UX + branding)

## Estilo general

- **Tema oscuro por defecto** (modo trader) con opción light.
- Diseño minimalista tipo “terminal moderno” pero limpio.

## Paleta

- Fondo: negros/grises profundos
- Texto: alto contraste
- Colores semánticos:

  - Verde (ganancia), Rojo (pérdida), Amarillo (BE/neutral), Azul (info)

- Evitar saturación: los gráficos deben ser claros.

## Tipografía

- Inter / SF Pro / system font
- Números monoespaciados en tablas (para lectura rápida)

## Componentes UI clave

- Tabla de trades tipo “pro” con sticky header, filtros rápidos y búsqueda
- “Trade detail” como ficha con timeline de fills
- Chips de tags (setup, error, emoción)
- Gráficos sobrios, sin ruido

---

# 4) Stack tecnológico (decisiones finales)

## Backend

- **Node.js + NestJS**
- **PostgreSQL**
- **Prisma ORM**
- **Redis** (cache + jobs)
- Auth: **JWT + Refresh tokens** (rotación)
- API: REST (MVP) + WebSockets opcional futuro

## Frontend

- **Vue 3 + TypeScript**
- UI: **Tailwind CSS**
- Componentes: **shadcn-vue** (o Headless UI + tus componentes)
- Charts: **Apache ECharts** (muy bueno para finance) o Chart.js (ECharts recomendado)

## Infra/DevOps

- Docker Compose (dev)
- Producción: Kubernetes (cuando toque) o Docker en un VPS al inicio
- CI/CD: GitHub Actions (o Bitbucket Pipelines si lo usas)
- Observabilidad: Sentry + OpenTelemetry (fase 2)

## Arquitectura (simple y sólida)

- Monolito NestJS modular (MVP) con módulos:

  - auth, accounts, instruments, strategies, trades, fills, reports, imports

- Event bus interno (Domain Events) para:

  - recalcular métricas al crear fill
  - actualizar equity snapshots

---

# 5) Permisos y multi-tenant

- Multi-tenant por `user_id` (simple)
- Roles (MVP):

  - Owner (tú)
  - (fase 2) Viewer/Analyst

---

# 6) Entregables del MVP (lo que queda listo)

1. Registro de trades con **parciales reales** (multi-entry/multi-exit)
2. Dashboard con equity, DD y KPIs
3. Reportes por estrategia/setup/símbolo/mercado
4. Import CSV con mapeo
5. Export CSV/XLSX
6. UI dark moderna y consistente

---

# Documentación de Instrumentos - Trading OS

Este documento describe el sistema de catálogo de instrumentos del Trading OS, que permite registrar y gestionar instrumentos de múltiples mercados usando un formato de ticker normalizado.

## Formato de Ticker Normalizado

### Decisión de Diseño

El sistema utiliza un formato de ticker normalizado para identificar de manera única los instrumentos:

```
MARKET:SYMBOL
```

Donde:
- **MARKET**: Identificador del mercado o exchange (ej: BINANCE, NASDAQ, NYSE, FX)
- **SYMBOL**: Símbolo del instrumento (ej: BTCUSDT, AAPL, SPY, EURUSD)
- Ambos se normalizan automáticamente a **uppercase**

### Ejemplos por Tipo de Mercado

#### Criptomonedas (CRYPTO)
- `BINANCE:BTCUSDT` - Bitcoin en Binance
- `COINBASE:BTCUSD` - Bitcoin en Coinbase
- `KRAKEN:ETHUSD` - Ethereum en Kraken
- `BINANCE:ETHUSDT` - Ethereum en Binance

#### Acciones (STOCK)
- `NASDAQ:AAPL` - Apple Inc.
- `NYSE:TSLA` - Tesla Inc.
- `NYSE:MSFT` - Microsoft Corporation
- `NASDAQ:GOOGL` - Alphabet Inc.

#### ETFs (ETF)
- `NYSE:SPY` - SPDR S&P 500 ETF
- `NASDAQ:QQQ` - Invesco QQQ Trust
- `NYSE:VTI` - Vanguard Total Stock Market ETF
- `NYSE:GLD` - SPDR Gold Trust

#### Forex (FOREX)
- `FX:EURUSD` - Euro/Dólar estadounidense
- `FX:GBPUSD` - Libra esterlina/Dólar estadounidense
- `FX:USDJPY` - Dólar estadounidense/Yen japonés
- `FX:EURGBP` - Euro/Libra esterlina

#### Futuros (FUTURES)
- `CME:ES` - E-mini S&P 500 (Chicago Mercantile Exchange)
- `NYMEX:CL` - Crude Oil (New York Mercantile Exchange)
- `ICE:BRENT` - Brent Crude Oil (Intercontinental Exchange)
- `CME:GC` - Gold Futures

#### Opciones (OPTIONS)
- `CBOE:SPX` - S&P 500 Index Options
- `CBOE:VIX` - VIX Options

## Modelo de Datos

### Campos Requeridos

Todos los instrumentos requieren:
- `market`: Mercado o exchange (string, uppercase)
- `symbol`: Símbolo del instrumento (string, uppercase)
- `name`: Nombre completo del instrumento (string)
- `type`: Tipo de instrumento (enum: CRYPTO, STOCK, ETF, FOREX, FUTURES, OPTIONS)
- `currencyQuote`: Moneda de cotización (string, 2-4 caracteres uppercase)

### Campos Opcionales

- `tickSize`: Tamaño mínimo de movimiento de precio (decimal)
  - Útil para validaciones de precio
  - Ejemplo: 0.01 para BTCUSDT, 0.0001 para EURUSD
- `contractSize`: Tamaño de contrato (decimal)
  - **Altamente recomendado** para FOREX y FUTURES
  - Ejemplo: 100000 para forex estándar
- `notes`: Notas adicionales sobre el instrumento (string)

### Campos Generados Automáticamente

- `ticker`: Se genera automáticamente como `MARKET:SYMBOL` (uppercase)
- `id`: UUID generado automáticamente
- `userId`: ID del usuario propietario (multi-tenant)
- `isActive`: Boolean, default `true` (para soft delete)
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

## Convenciones de Naming

### Market (Mercado)

- **Criptomonedas**: Usar el nombre del exchange en uppercase
  - Ejemplos: `BINANCE`, `COINBASE`, `KRAKEN`, `FTX`
- **Stocks/ETFs**: Usar el nombre del exchange en uppercase
  - Ejemplos: `NASDAQ`, `NYSE`, `AMEX`
- **Forex**: Usar `FX` como prefijo estándar
  - Ejemplo: `FX:EURUSD`
- **Futures**: Usar el nombre del exchange en uppercase
  - Ejemplos: `CME`, `NYMEX`, `ICE`
- **Opciones**: Usar el nombre del exchange en uppercase
  - Ejemplos: `CBOE`, `NYSE`

### Symbol (Símbolo)

- **Criptomonedas**: Usar el formato estándar del exchange
  - Ejemplos: `BTCUSDT`, `ETHUSD`, `BNBUSDT`
- **Stocks**: Usar el ticker estándar
  - Ejemplos: `AAPL`, `TSLA`, `MSFT`
- **ETFs**: Usar el ticker estándar
  - Ejemplos: `SPY`, `QQQ`, `VTI`
- **Forex**: Usar formato estándar de pares de divisas
  - Ejemplos: `EURUSD`, `GBPUSD`, `USDJPY`
- **Futures**: Usar el símbolo del contrato
  - Ejemplos: `ES`, `CL`, `GC`

### Name (Nombre)

- Usar el nombre completo y descriptivo del instrumento
- Ejemplos:
  - "Bitcoin" (no "BTC")
  - "Apple Inc." (no "AAPL")
  - "SPDR S&P 500 ETF" (no "SPY")
  - "Euro/US Dollar" (no "EURUSD")

## Campos Requeridos por Tipo

### CRYPTO
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Recomendados**: tickSize
- **Opcionales**: contractSize, notes

### STOCK
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Recomendados**: tickSize
- **Opcionales**: notes

### ETF
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Recomendados**: tickSize
- **Opcionales**: notes

### FOREX
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Altamente recomendados**: contractSize (típicamente 100000)
- **Recomendados**: tickSize (típicamente 0.0001 o 0.00001)
- **Opcionales**: notes

### FUTURES
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Altamente recomendados**: contractSize
- **Recomendados**: tickSize
- **Opcionales**: notes

### OPTIONS
- **Requeridos**: market, symbol, name, type, currencyQuote
- **Recomendados**: tickSize
- **Opcionales**: contractSize, notes

## Reglas de Negocio

### Unicidad de Ticker

- El ticker (`MARKET:SYMBOL`) debe ser único **por usuario**
- Diferentes usuarios pueden tener el mismo ticker (multi-tenant)
- Si intentas crear un instrumento con un ticker que ya existe para tu usuario, recibirás un error `409 Conflict`

### Normalización Automática

- `market` se normaliza a uppercase automáticamente
- `symbol` se normaliza a uppercase automáticamente
- `currencyQuote` se normaliza a uppercase automáticamente
- El `ticker` se genera automáticamente: `MARKET:SYMBOL` (uppercase)

### Soft Delete

- Los instrumentos no se eliminan físicamente
- Al eliminar, se marca `isActive = false`
- Los listados por defecto solo muestran instrumentos activos (`isActive = true`)
- Puedes reactivar un instrumento actualizando `isActive = true`

### Inmutabilidad de Market y Symbol

- Una vez creado, `market` y `symbol` **no se pueden cambiar**
- Si necesitas cambiar el market o symbol, debes crear un nuevo instrumento
- Esto asegura la integridad del ticker y la consistencia en reportes

### Validaciones

1. **Market**: Solo letras, números, guiones y guiones bajos (regex: `^[A-Z0-9_-]+$`)
2. **Symbol**: Solo letras, números, puntos, guiones y guiones bajos (regex: `^[A-Z0-9._-]+$`)
3. **CurrencyQuote**: 2-4 caracteres uppercase (regex: `^[A-Z]{2,4}$`)
4. **TickSize**: Debe ser > 0 si se proporciona
5. **ContractSize**: Debe ser > 0 si se proporciona

## Uso en Otros Módulos

El catálogo de instrumentos se utilizará en módulos futuros:

### Módulo E - Operaciones (Trades)
- Al crear un trade, se selecciona un instrumento del catálogo
- El ticker normalizado permite identificar claramente el instrumento
- Facilita reportes y análisis por instrumento

### Módulo F - Dashboard
- Estadísticas por instrumento
- Performance por mercado
- Distribución de trades por instrumento

### Módulo G - Reportes
- Reportes por símbolo
- Análisis de performance por instrumento
- Filtros por mercado y tipo

## API Endpoints

### Crear Instrumento
```http
POST /api/instruments
Authorization: Bearer {token}
Content-Type: application/json

{
  "market": "BINANCE",
  "symbol": "BTCUSDT",
  "name": "Bitcoin",
  "type": "CRYPTO",
  "currencyQuote": "USDT",
  "tickSize": 0.01,
  "notes": "Principal criptomoneda"
}
```

### Listar Instrumentos
```http
GET /api/instruments?market=BINANCE&type=CRYPTO&page=1&limit=50
Authorization: Bearer {token}
```

### Buscar por Ticker
```http
GET /api/instruments/ticker/BINANCE:BTCUSDT
Authorization: Bearer {token}
```

### Búsqueda Rápida (Autocomplete)
```http
GET /api/instruments/search?q=BTC&limit=10
Authorization: Bearer {token}
```

### Actualizar Instrumento
```http
PATCH /api/instruments/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Bitcoin",
  "notes": "Updated notes"
}
```

### Eliminar Instrumento (Soft Delete)
```http
DELETE /api/instruments/{id}
Authorization: Bearer {token}
```

## Ejemplos de Uso

### Crear Instrumento de Crypto
```json
{
  "market": "BINANCE",
  "symbol": "ETHUSDT",
  "name": "Ethereum",
  "type": "CRYPTO",
  "currencyQuote": "USDT",
  "tickSize": 0.01
}
```
**Ticker generado**: `BINANCE:ETHUSDT`

### Crear Instrumento de Stock
```json
{
  "market": "NASDAQ",
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "type": "STOCK",
  "currencyQuote": "USD",
  "tickSize": 0.01
}
```
**Ticker generado**: `NASDAQ:AAPL`

### Crear Instrumento de Forex
```json
{
  "market": "FX",
  "symbol": "EURUSD",
  "name": "Euro/US Dollar",
  "type": "FOREX",
  "currencyQuote": "USD",
  "tickSize": 0.0001,
  "contractSize": 100000
}
```
**Ticker generado**: `FX:EURUSD`

### Crear Instrumento de Futures
```json
{
  "market": "CME",
  "symbol": "ES",
  "name": "E-mini S&P 500",
  "type": "FUTURES",
  "currencyQuote": "USD",
  "tickSize": 0.25,
  "contractSize": 50
}
```
**Ticker generado**: `CME:ES`

## Mejores Prácticas

1. **Usar nombres descriptivos**: El campo `name` debe ser claro y completo
2. **Consistencia en markets**: Usar siempre el mismo formato para el mismo exchange
3. **TickSize cuando sea posible**: Facilita validaciones de precio en trades
4. **ContractSize para FOREX/FUTURES**: Esencial para cálculos correctos
5. **Notas útiles**: Usar el campo `notes` para información adicional relevante
6. **No duplicar tickers**: Verificar antes de crear si ya existe un instrumento similar

## Notas de Implementación

### Performance

- Los índices compuestos (`userId, market` y `userId, type`) optimizan las búsquedas filtradas
- El índice único en `userId, ticker` garantiza unicidad y búsquedas rápidas
- La búsqueda en `name`, `symbol` y `ticker` usa índices para eficiencia

### Escalabilidad

- El sistema soporta múltiples usuarios con sus propios catálogos
- Los instrumentos se pueden reutilizar en múltiples trades
- El soft delete preserva datos históricos sin afectar reportes

### Integración Futura

- El catálogo se integrará con el módulo de trades (Módulo E)
- Los instrumentos se usarán para reportes y análisis
- El formato normalizado facilita la agregación de datos por mercado


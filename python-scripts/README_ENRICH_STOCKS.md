# Script de Enriquecimiento de Datos de Acciones

Este script enriquece el archivo `stocks.json` de Quantfury con información adicional sobre las acciones.

## Características

El script agrega los siguientes campos a cada acción:

### Campos Principales (Solicitados)
- **marketCap**: Capitalización de mercado en número (para poder ordenar)
- **exchange**: Bolsa en la que opera la acción (normalizado a nombres estándar como NYSE, NASDAQ, LSE, etc.)
- **country**: País de la acción
- **exchangeCountry**: País de la bolsa

**Nota sobre exchanges**: El script normaliza automáticamente los códigos abreviados de Yahoo Finance (como "NYQ", "NMS", "NGM") a nombres estándar reconocibles (como "NYSE", "NASDAQ"). Esto asegura que todos los exchanges se muestren con nombres consistentes y reconocibles.

### Campos Adicionales
- **currency**: Moneda de cotización
- **sector**: Sector de la empresa
- **industry**: Industria de la empresa
- **market**: Mercado
- **fullTimeEmployees**: Número de empleados
- **website**: Sitio web de la empresa
- **longBusinessSummary**: Resumen del negocio (truncado a 500 caracteres)

## Uso

### Instalación de Dependencias

```bash
cd python-scripts
pip install -r requirements.txt
```

### Ejecución

```bash
python enrich_stocks.py
```

El script:
1. Lee el archivo `quantfury/stocks.json`
2. Procesa cada acción en paralelo (5 workers por defecto)
3. Guarda los resultados en `quantfury/stocks_enriched.json`
4. Genera estadísticas en `quantfury/enrichment_stats.json`

## Salidas

### stocks_enriched.json
Archivo JSON con todas las acciones enriquecidas. Cada acción tiene la estructura:

```json
{
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "marketCap": 3000000000000,
  "exchange": "NMS",
  "country": "United States",
  "exchangeCountry": "United States",
  "currency": "USD",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "market": "us_market",
  "fullTimeEmployees": 164000,
  "website": "https://www.apple.com",
  "longBusinessSummary": "Apple Inc. designs, manufactures, and markets...",
  "error": null
}
```

### enrichment_stats.json
Estadísticas del procesamiento:

```json
{
  "total": 7583,
  "con_datos": 7200,
  "con_errores": 383,
  "con_market_cap": 7100,
  "con_exchange": 7150,
  "con_pais": 7200,
  "con_sector": 7000,
  "fecha_procesamiento": "2025-01-XX..."
}
```

## Manejo de Errores

El script maneja varios casos de error:
- Tickers no encontrados en Yahoo Finance
- Problemas de conexión
- Datos faltantes
- Rate limiting (con pausas entre requests)

Si una acción no puede ser procesada, se guarda con un campo `error` que describe el problema.

## Optimizaciones

- **Procesamiento paralelo**: Usa ThreadPoolExecutor para procesar múltiples acciones simultáneamente
- **Rate limiting**: Incluye pausas entre requests para evitar bloqueos
- **Reintentos**: Intenta hasta 3 veces en caso de error
- **Barra de progreso**: Muestra el progreso del procesamiento

## Notas

- El script puede tardar bastante tiempo (varias horas) para procesar todas las acciones debido a las limitaciones de rate limiting
- Algunos tickers pueden no estar disponibles en Yahoo Finance
- El script intenta diferentes formatos de ticker (agregando sufijos como .TO, .L, etc.) para acciones internacionales
- Los datos se obtienen de Yahoo Finance, que puede tener limitaciones de rate limiting

## Mejoras Futuras

- Cache de resultados para evitar reprocesar acciones ya enriquecidas
- Soporte para múltiples fuentes de datos (Alpha Vantage, etc.)
- Mejora en la detección de país y exchange
- Validación de datos antes de guardar


# Explicación del Rate Limiting y Pausas

## ¿Cómo Funcionan las Pausas?

El script implementa varias estrategias para evitar el error "too many requests":

### 1. Pausa Entre Peticiones (delay_between_requests)

**Valor por defecto: 0.5 segundos**

- Cada worker espera **0.5 segundos** entre una petición y la siguiente
- Con 2 workers en paralelo, esto significa aproximadamente **1 petición por segundo** en total
- Esto es muy conservador para evitar bloqueos

**Ejemplo:**
```
Worker 1: Petición → Espera 0.5s → Siguiente petición
Worker 2: Petición → Espera 0.5s → Siguiente petición
```

### 2. Workers Paralelos (max_workers)

**Valor por defecto: 2**

- Solo **2 peticiones simultáneas** a la vez
- Reducido de 5 a 2 para ser más conservador
- Menos workers = menos peticiones simultáneas = menos riesgo de rate limiting

### 3. Manejo de Error 429 (Too Many Requests)

Cuando Yahoo Finance devuelve un error 429:

- **Primer reintento**: Espera 60 segundos
- **Segundo reintento**: Espera 120 segundos  
- **Tercer reintento**: Espera 180 segundos
- Si después de 3 intentos sigue fallando, marca la acción con error

### 4. Backoff Exponencial para Otros Errores

Para otros errores (no rate limiting):

- **Primer reintento**: Espera 2 segundos
- **Segundo reintento**: Espera 4 segundos
- **Tercer reintento**: Espera 6 segundos

## Cálculo de Tiempo Estimado

Con la configuración actual:
- **2 workers** en paralelo
- **0.5 segundos** entre peticiones por worker
- **~1 petición por segundo** en total

Para **7,583 acciones**:
- Tiempo mínimo: ~7,583 segundos = **~2.1 horas**
- Tiempo real: **~3-4 horas** (incluyendo errores y reintentos)

## Ajustar la Velocidad

Si quieres procesar más rápido (pero con más riesgo de rate limiting):

```python
# En main(), cambiar:
enriched_stocks = process_stocks_batch(
    stocks, 
    max_workers=3,           # Más workers = más rápido pero más riesgo
    delay_between_requests=0.3  # Menos pausa = más rápido pero más riesgo
)
```

Si quieres ser más conservador (más lento pero más seguro):

```python
# En main(), cambiar:
enriched_stocks = process_stocks_batch(
    stocks, 
    max_workers=1,            # Solo 1 worker = muy seguro
    delay_between_requests=1.0  # 1 segundo entre peticiones = muy seguro
)
```

## Recomendaciones

1. **Para procesar todo de una vez**: Usa la configuración por defecto (2 workers, 0.5s)
2. **Si recibes errores 429**: Aumenta `delay_between_requests` a 1.0 o más
3. **Si quieres procesar más rápido**: Puedes aumentar workers a 3, pero monitorea los errores
4. **Procesamiento por lotes**: Considera dividir el archivo en lotes más pequeños y procesarlos en diferentes momentos

## Procesamiento por Lotes (Recomendado)

Si quieres evitar problemas de rate limiting, puedes procesar en lotes:

```python
# Procesar solo las primeras 1000 acciones
enriched_stocks = process_stocks_batch(stocks[:1000], max_workers=2, delay_between_requests=0.5)

# Guardar resultados parciales
# Luego procesar el siguiente lote
enriched_stocks += process_stocks_batch(stocks[1000:2000], max_workers=2, delay_between_requests=0.5)
```

Esto te permite:
- Pausar y reanudar el procesamiento
- Evitar perder todo el progreso si hay un error
- Procesar en diferentes momentos del día


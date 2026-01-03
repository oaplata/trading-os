# Sistema de Puntuación Técnica (0-100)

Este documento explica el sistema de puntuación técnica implementado en `analysis.py` para filtrar señales de trading diarias.

## Descripción General

El sistema calcula un **score técnico de 0 a 100** basado en 6 módulos evaluativos cuando existe una señal (especialmente alcista) en timeframe **1D**. El score ayuda a filtrar señales de calidad para operaciones swing de 4-6 semanas.

## Estructura del Sistema

### Gates (Filtros Duros)

Antes de calcular el score, se verifican 4 gates. Si **cualquier gate falla**, el score final es **0**.

1. **G1 - Tendencia Base**: `Close > MA200`
2. **G2 - Pendiente MA200**: `slope(MA200, 20) > 0`
3. **G3 - Liquidez**: `dollar_volume_avg20 >= $1,000,000`
4. **G4 - Volatilidad**: `ATR% <= 5%`

### Módulos de Scoring

El score final (0-100) se compone de 6 módulos:

| Módulo | Nombre | Peso Máximo | Descripción |
|--------|--------|-------------|-------------|
| **A** | Régimen de Tendencia | 25 | Fuerza de la tendencia alcista |
| **B** | Calidad del giro MA | 20 | Magnitud y persistencia del giro |
| **C** | Ubicación en swing | 20 | Retroceso óptimo (38-62%) |
| **D** | Riesgo/Volatilidad/Liquidez | 15 | ATR%, liquidez, costo de stop |
| **E** | Confirmación de demanda | 20 | Fuerza del cierre, breakout, volumen |
| **F** | Time-Fit 4-6 semanas | 15 | Estimación de duración esperada |

**Total: 100 puntos**

## Configuración

La configuración está centralizada en la clase `ScoringConfig` (dataclass). Puedes modificar:

### Ajustar Pesos de Módulos

```python
config = ScoringConfig()
config.A_max = 30  # Aumentar peso del módulo A
config.B_max = 15  # Reducir peso del módulo B
# Asegúrate de que la suma total sea 100
```

### Ajustar Umbrales de Gates

```python
config.min_dollar_volume = 2_000_000  # $2M mínimo
config.max_atr_percent = 4.0  # 4% máximo de ATR
config.ma_long_length = 200  # MA200 por defecto
```

### Ajustar Parámetros de Módulos

#### Módulo A - Tendencia
```python
config.A_price_above_ma_range = (-2.0, 2.0)  # Rango en ATR
config.A_ma_slope_range = (-0.05, 0.05)  # Slope/ATR
config.A_breakout_lookback = 55
```

#### Módulo B - Giro MA
```python
config.B_turn_magnitude_range = (0.0, 0.5)  # abs(MA_change)/ATR
config.B_extension_atr_limit = 2.0  # Límite de extensión
```

#### Módulo C - Ubicación
```python
config.C_swing_lookback = 120
config.C_retracement_ideal = (0.38, 0.62)  # 38-62% ideal
config.C_retracement_ok = (0.23, 0.78)  # 23-78% aceptable
```

#### Módulo D - Riesgo
```python
config.D_target_atr_percent = 2.0  # ATR% objetivo
config.D_max_atr_percent = 5.0  # ATR% máximo
config.D_good_dollar_volume = 10_000_000  # $10M bueno
config.D_stop_cost_target_percent = 3.0  # Stop cost objetivo
```

#### Módulo E - Demanda
```python
config.E_close_strength_range = (0.5, 0.9)  # Posición del cierre
config.E_breakout_confirm_lookback = 20
config.E_volume_relative_good = 1.2  # 1.2x volumen promedio
config.E_volume_relative_bad = 0.8
```

#### Módulo F - Time-Fit (CRÍTICO)
```python
config.F_k_target = 8.0  # Target = entry + 8*ATR
config.F_stop_atr_mult = 4.0  # Stop = entry - 4*ATR
config.F_er_lookback = 20  # Lookback para ER
config.F_er_floor = 0.20  # ER mínimo
config.F_ideal_bars = (20.0, 30.0)  # 4-6 semanas ideal
config.F_ok_bars = (15.0, 40.0)  # Rango aceptable
```

## Uso

### Ejemplo Básico

```bash
python analysis.py AAPL --timeframe 1d --ma_length 21 --consecutive_periods 3
```

### Salida JSON

El script genera un JSON con la siguiente estructura:

```json
{
  "ticker": "AAPL",
  "timestamp": "2024-01-15T10:30:00",
  "ath": { ... },
  "media_movil": { ... },
  "signal": {
    "type": "alcista",
    "ma_length": 21,
    "consecutive_periods": 3
  },
  "technical_score": {
    "gates": {
      "pass": true,
      "details": [ ... ]
    },
    "score": {
      "final": 72.5,
      "modules": {
        "A_trend": { "score": 18.2, "max": 25, "details": [...] },
        "B_turn_quality": { "score": 15.8, "max": 20, "details": [...] },
        "C_location": { "score": 16.5, "max": 20, "details": [...] },
        "D_risk": { "score": 11.2, "max": 15, "details": [...] },
        "E_demand": { "score": 14.3, "max": 20, "details": [...] },
        "F_timefit": { "score": 12.5, "max": 15, "details": [...] }
      }
    },
    "raw_metrics": { ... },
    "normalized_metrics": { ... },
    "forecast": {
      "entry": 150.25,
      "atr14": 2.15,
      "k_target": 8,
      "stop_atr_mult": 4,
      "tp": 167.45,
      "sl": 141.65,
      "er": 0.35,
      "expected_bars_to_tp": 22.8,
      "expected_weeks_to_tp": 4.6
    },
    "explain": {
      "summary": [ ... ],
      "module_explanations": {
        "F_timefit": {
          "why": "TP a 8 ATR; SL a 4 ATR. ER(20)=0.350. Expected bars to TP=22.8 => 4.6 semanas...",
          "calc": { ... }
        }
      }
    }
  }
}
```

## Interpretación del Score

- **80-100**: Señal excelente, alta probabilidad de éxito
- **60-79**: Señal buena, condiciones favorables
- **40-59**: Señal moderada, revisar condiciones
- **20-39**: Señal débil, considerar evitar
- **0-19**: Señal muy débil o gates fallidos

## Módulo F - Time-Fit (Detalle)

El módulo F es crítico porque estima si el trade encaja en el objetivo de **4-6 semanas**.

### Cálculo

1. **Entry**: Close de la vela de señal
2. **TP**: Entry + 8*ATR
3. **SL**: Entry - 4*ATR
4. **ER**: Efficiency Ratio (Kaufman) con lookback 20
5. **Expected bars**: `(8*ATR) / max(ER, 0.20) / ATR = 8 / max(ER, 0.20)`
6. **Expected weeks**: `expected_bars / 5.0`

### Scoring

- **Ideal**: 20-30 barras (4-6 semanas) → Score = 1.0
- **Aceptable**: 15-40 barras → Score cae linealmente
- **Fuera de rango**: Score = 0.0

## Helpers Disponibles

El script incluye funciones helper reutilizables:

- `clamp(x, lo, hi)`: Limita valor entre lo y hi
- `minmax(x, lo, hi)`: Normaliza x a [0, 1] sobre rango [lo, hi]
- `weighted_mean(values, weights)`: Media ponderada
- `score_peak_window(x, ideal_lo, ideal_hi, ok_lo, ok_hi)`: Score basado en ventana
- `calculate_atr(hist, period)`: Calcula ATR clásico
- `calculate_er(hist, period)`: Calcula Efficiency Ratio de Kaufman

## Notas Importantes

1. **Timeframe**: El scoring solo se calcula para timeframe `1d`
2. **Señal requerida**: El scoring solo se calcula si `hay_senal == True`
3. **Gates**: Si falla cualquier gate, el score es 0 y se explica el motivo
4. **Robustez**: El sistema maneja NaNs y datos insuficientes degradando el score apropiadamente

## Personalización Avanzada

Para personalizar completamente el sistema, modifica la clase `ScoringConfig` en el código fuente o crea una instancia personalizada:

```python
from analysis import ScoringConfig, calculate_technical_score

# Crear configuración personalizada
custom_config = ScoringConfig()
custom_config.A_max = 30
custom_config.B_max = 15
# ... ajustar otros parámetros

# Usar en el cálculo
score_result = calculate_technical_score(
    hist,
    ma_length=21,
    consecutive_periods=3,
    signal_type='alcista',
    config=custom_config
)
```


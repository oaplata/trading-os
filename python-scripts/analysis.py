#!/usr/bin/env python3
"""
Script para analizar el All-Time High (ATH) de un ticker desde Yahoo Finance.

Este script descarga el histórico máximo de un ticker, calcula el ATH,
determina cuánto tiempo ha pasado desde entonces y el drawdown desde el ATH.
Incluye sistema de puntuación técnica (0-100) para filtrar señales.
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, List, Tuple

import pandas as pd
import numpy as np
import yfinance as yf


# ============================================================================
# HELPERS OBLIGATORIOS
# ============================================================================

def clamp(x: float, lo: float, hi: float) -> float:
    """Limita un valor entre lo y hi."""
    return max(lo, min(hi, x))


def minmax(x: float, lo: float, hi: float) -> float:
    """Normaliza x al rango [0, 1] usando clamp sobre [lo, hi]."""
    if hi == lo:
        return 0.5
    clamped = clamp(x, lo, hi)
    return (clamped - lo) / (hi - lo)


def weighted_mean(values: List[float], weights: List[float]) -> float:
    """Calcula la media ponderada de valores."""
    if not values or not weights or len(values) != len(weights):
        return 0.0
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in zip(values, weights)) / total_weight


def score_peak_window(
    x: float,
    ideal_lo: float,
    ideal_hi: float,
    ok_lo: float,
    ok_hi: float
) -> float:
    """
    Score 0..1 basado en ventana ideal/ok.
    - score=1 si x en [ideal_lo, ideal_hi]
    - cae linealmente hasta 0 en los bordes de [ok_lo, ok_hi]
    - fuera de [ok_lo, ok_hi] => 0
    """
    if x < ok_lo or x > ok_hi:
        return 0.0
    
    if ideal_lo <= x <= ideal_hi:
        return 1.0
    
    if x < ideal_lo:
        # Entre ok_lo e ideal_lo: interpolación lineal
        if ok_lo == ideal_lo:
            return 1.0
        return (x - ok_lo) / (ideal_lo - ok_lo)
    else:
        # Entre ideal_hi y ok_hi: interpolación lineal
        if ideal_hi == ok_hi:
            return 1.0
        return (ok_hi - x) / (ok_hi - ideal_hi)


def calculate_atr(hist: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calcula ATR(period) clásico con True Range.
    TR = max(high-low, abs(high-prev_close), abs(low-prev_close))
    ATR = SMA(TR, period)
    """
    df = hist.copy()
    
    # True Range
    high_low = df['High'] - df['Low']
    high_prev_close = abs(df['High'] - df['Close'].shift(1))
    low_prev_close = abs(df['Low'] - df['Close'].shift(1))
    
    tr_df = pd.concat([high_low, high_prev_close, low_prev_close], axis=1)
    tr = tr_df.max(axis=1)  # type: ignore
    
    # ATR = SMA de TR
    atr = tr.rolling(window=period).mean()
    
    return atr  # type: ignore


def calculate_er(hist: pd.DataFrame, period: int = 20) -> pd.Series:
    """
    Calcula Efficiency Ratio ER(period) de Kaufman.
    ER = abs(Close[t] - Close[t-n]) / sum(abs(diff(Close)), n)
    ER en [0,1]
    """
    df = hist.copy()
    close = df['Close']
    
    # Cambio neto
    net_change = abs(close - close.shift(period))
    
    # Suma de cambios absolutos
    abs_changes = abs(close.diff())
    sum_abs_changes = abs_changes.rolling(window=period).sum()
    
    # ER
    sum_abs_changes_clean = sum_abs_changes.replace(0, np.nan)  # type: ignore
    er = net_change / sum_abs_changes_clean
    
    return er.fillna(0.0)  # type: ignore


# ============================================================================
# CONFIGURACIÓN CENTRAL
# ============================================================================

@dataclass
class ScoringConfig:
    """Configuración central del sistema de scoring."""
    
    # Gates
    ma_long_length: int = 200
    slope_lookback: int = 20
    min_dollar_volume: float = 1_000_000  # $1M
    max_atr_percent: float = 5.0  # 5%
    
    # Módulo A - Régimen de Tendencia (max: 25)
    A_max: int = 25
    A_weights: List[float] = field(default_factory=lambda: [0.4, 0.4, 0.2])
    A_price_above_ma_range: Tuple[float, float] = (-2.0, 2.0)  # en ATR
    A_ma_slope_range: Tuple[float, float] = (-0.05, 0.05)  # slope/ATR
    A_breakout_lookback: int = 55
    
    # Módulo B - Calidad del giro MA (max: 20)
    B_max: int = 20
    B_weights: List[float] = field(default_factory=lambda: [0.4, 0.4, 0.2])
    B_turn_magnitude_range: Tuple[float, float] = (0.0, 0.5)  # abs(MA_change)/ATR
    B_extension_atr_limit: float = 2.0
    B_extension_atr_limit2: float = 4.0
    
    # Módulo C - Ubicación en swing (max: 20)
    C_max: int = 20
    C_swing_lookback: int = 120
    C_retracement_ideal: Tuple[float, float] = (0.38, 0.62)
    C_retracement_ok: Tuple[float, float] = (0.23, 0.78)
    
    # Módulo D - Riesgo/Volatilidad/Liquidez (max: 15)
    D_max: int = 15
    D_weights: List[float] = field(default_factory=lambda: [0.4, 0.4, 0.2])
    D_target_atr_percent: float = 2.0
    D_max_atr_percent: float = 5.0
    D_good_dollar_volume: float = 10_000_000  # $10M
    D_stop_cost_target_percent: float = 3.0
    D_stop_cost_max_percent: float = 8.0
    
    # Módulo E - Confirmación de demanda (max: 20)
    E_max: int = 20
    E_weights: List[float] = field(default_factory=lambda: [0.4, 0.3, 0.3])
    E_close_strength_range: Tuple[float, float] = (0.5, 0.9)
    E_breakout_confirm_lookback: int = 20
    E_volume_relative_good: float = 1.2
    E_volume_relative_bad: float = 0.8
    
    # Módulo F - Time-Fit 4-6 semanas (max: 15)
    F_max: int = 15
    F_k_target: float = 8.0
    F_stop_atr_mult: float = 4.0
    F_er_lookback: int = 20
    F_er_floor: float = 0.20
    F_ideal_bars: Tuple[float, float] = (20.0, 30.0)
    F_ok_bars: Tuple[float, float] = (15.0, 40.0)
    
    # ATR y ER
    atr_period: int = 14
    er_period: int = 20


# ============================================================================
# SISTEMA DE GATES
# ============================================================================

def check_gates(
    hist: pd.DataFrame,
    config: ScoringConfig,
    ma_short_length: int
) -> Dict:
    """
    Verifica los gates (filtros duros).
    Si falla alguno, el score final será 0.
    """
    if len(hist) < max(config.ma_long_length, config.slope_lookback, 20):
        return {
            'pass': False,
            'details': [{
                'id': 'G0',
                'pass': False,
                'value': len(hist),
                'threshold': max(config.ma_long_length, config.slope_lookback, 20),
                'reason': 'Datos insuficientes para calcular métricas'
            }]
        }
    
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    
    # Calcular ATR para normalizaciones
    atr_series = calculate_atr(df, config.atr_period)
    atr_actual = float(atr_series.iloc[-1]) if not atr_series.empty and pd.notna(atr_series.iloc[-1]) else None
    
    if atr_actual is None or atr_actual == 0:
        return {
            'pass': False,
            'details': [{
                'id': 'G0',
                'pass': False,
                'value': None,
                'threshold': None,
                'reason': 'No se pudo calcular ATR'
            }]
        }
    
    gates = []
    
    # G1: Tendencia base - Close > MA_long
    ma_long = df['Close'].rolling(window=config.ma_long_length).mean()
    ma_long_actual = float(ma_long.iloc[-1]) if pd.notna(ma_long.iloc[-1]) else None
    
    if ma_long_actual is None:
        gates.append({
            'id': 'G1',
            'pass': False,
            'value': None,
            'threshold': None,
            'reason': 'No se pudo calcular MA_long'
        })
    else:
        g1_pass = close_actual > ma_long_actual
        gates.append({
            'id': 'G1',
            'pass': g1_pass,
            'value': close_actual,
            'threshold': ma_long_actual,
            'reason': f'Close ({close_actual:.2f}) {" > " if g1_pass else " <= "} MA{config.ma_long_length} ({ma_long_actual:.2f})'
        })
    
    # G2: Pendiente MA_long > 0
    if len(ma_long) >= config.slope_lookback + 1:
        ma_long_slope = float(ma_long.iloc[-1] - ma_long.iloc[-config.slope_lookback-1]) / config.slope_lookback
        g2_pass = ma_long_slope > 0
        gates.append({
            'id': 'G2',
            'pass': g2_pass,
            'value': ma_long_slope,
            'threshold': 0.0,
            'reason': f'Slope MA{config.ma_long_length} ({ma_long_slope:.4f}) {" > " if g2_pass else " <= "} 0'
        })
    else:
        gates.append({
            'id': 'G2',
            'pass': False,
            'value': None,
            'threshold': None,
            'reason': 'Datos insuficientes para calcular slope'
        })
    
    # G3: Liquidez - dollar_volume_avg20 >= min_dollar_volume
    dollar_volume = df['Volume'] * df['Close']
    dollar_volume_avg20 = float(dollar_volume.rolling(window=20).mean().iloc[-1]) if len(dollar_volume) >= 20 else None
    
    if dollar_volume_avg20 is None:
        gates.append({
            'id': 'G3',
            'pass': False,
            'value': None,
            'threshold': config.min_dollar_volume,
            'reason': 'Datos insuficientes para calcular dollar volume'
        })
    else:
        g3_pass = dollar_volume_avg20 >= config.min_dollar_volume
        gates.append({
            'id': 'G3',
            'pass': g3_pass,
            'value': dollar_volume_avg20,
            'threshold': config.min_dollar_volume,
            'reason': f'Dollar volume avg20 (${dollar_volume_avg20:,.0f}) {" >= " if g3_pass else " < "} ${config.min_dollar_volume:,.0f}'
        })
    
    # G4: Volatilidad - ATR% <= max_atr_percent
    atr_percent = (atr_actual / close_actual) * 100
    g4_pass = atr_percent <= config.max_atr_percent
    gates.append({
        'id': 'G4',
        'pass': g4_pass,
        'value': atr_percent,
        'threshold': config.max_atr_percent,
        'reason': f'ATR% ({atr_percent:.2f}%) {" <= " if g4_pass else " > "} {config.max_atr_percent}%'
    })
    
    all_pass = all(g['pass'] for g in gates)
    
    return {
        'pass': all_pass,
        'details': gates
    }


# ============================================================================
# MÓDULOS DE SCORING
# ============================================================================

def score_module_a_trend(
    hist: pd.DataFrame,
    config: ScoringConfig,
    atr_series: pd.Series
) -> Dict:
    """
    Módulo A - Régimen de Tendencia (0-25)
    """
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    atr_actual = float(atr_series.iloc[-1])
    
    # Calcular MA200
    ma_long = df['Close'].rolling(window=config.ma_long_length).mean()
    ma_long_actual = float(ma_long.iloc[-1]) if pd.notna(ma_long.iloc[-1]) else None
    
    details = []
    scores = []
    
    # A1: price_above_ma_long_strength
    if ma_long_actual is not None and atr_actual > 0:
        distance_atr = (close_actual - ma_long_actual) / atr_actual
        a1_norm = minmax(distance_atr, config.A_price_above_ma_range[0], config.A_price_above_ma_range[1])
        a1_contrib = a1_norm * config.A_weights[0] * config.A_max
        details.append({
            'metric_name': 'price_above_ma_long_strength',
            'raw_value': distance_atr,
            'normalized_value': a1_norm,
            'points_contribution': a1_contrib,
            'rule_text': f'Distancia (Close-MA200)/ATR = {distance_atr:.2f}'
        })
        scores.append(a1_norm)
    else:
        details.append({
            'metric_name': 'price_above_ma_long_strength',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # A2: ma_long_slope_norm
    if len(ma_long) >= config.slope_lookback + 1 and atr_actual > 0:
        ma_long_slope = (ma_long.iloc[-1] - ma_long.iloc[-config.slope_lookback-1]) / config.slope_lookback
        slope_atr = ma_long_slope / atr_actual
        a2_norm = minmax(slope_atr, config.A_ma_slope_range[0], config.A_ma_slope_range[1])
        a2_contrib = a2_norm * config.A_weights[1] * config.A_max
        details.append({
            'metric_name': 'ma_long_slope_norm',
            'raw_value': slope_atr,
            'normalized_value': a2_norm,
            'points_contribution': a2_contrib,
            'rule_text': f'Slope MA200/ATR = {slope_atr:.4f}'
        })
        scores.append(a2_norm)
    else:
        details.append({
            'metric_name': 'ma_long_slope_norm',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # A3: structure_proxy (breakout)
    if len(df) >= config.A_breakout_lookback:
        max_high_55 = float(df['High'].rolling(window=config.A_breakout_lookback).max().iloc[-1])
        breakout = close_actual > max_high_55
        a3_norm = 1.0 if breakout else 0.0
        a3_contrib = a3_norm * config.A_weights[2] * config.A_max
        details.append({
            'metric_name': 'structure_proxy',
            'raw_value': 1 if breakout else 0,
            'normalized_value': a3_norm,
            'points_contribution': a3_contrib,
            'rule_text': f'Breakout 55: Close ({close_actual:.2f}) {" > " if breakout else " <= "} max(High,55) ({max_high_55:.2f})'
        })
        scores.append(a3_norm)
    else:
        details.append({
            'metric_name': 'structure_proxy',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # Score final del módulo
    module_score = weighted_mean(scores, config.A_weights) * config.A_max
    
    return {
        'score': module_score,
        'max': config.A_max,
        'details': details
    }


def score_module_b_turn_quality(
    hist: pd.DataFrame,
    config: ScoringConfig,
    atr_series: pd.Series,
    ma_short_length: int,
    consecutive_periods: int
) -> Dict:
    """
    Módulo B - Calidad del giro de MA (0-20)
    """
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    atr_actual = float(atr_series.iloc[-1])
    
    # Calcular MA_short
    ma_short = df['Close'].rolling(window=ma_short_length).mean()
    ma_short_actual = float(ma_short.iloc[-1]) if pd.notna(ma_short.iloc[-1]) else None
    
    details = []
    scores = []
    
    # B1: turn_magnitude
    if ma_short_actual is not None and len(ma_short) >= 2 and atr_actual > 0:
        ma_change_last = float(ma_short.iloc[-1] - ma_short.iloc[-2])
        turn_magnitude = abs(ma_change_last) / atr_actual
        b1_norm = minmax(turn_magnitude, config.B_turn_magnitude_range[0], config.B_turn_magnitude_range[1])
        b1_contrib = b1_norm * config.B_weights[0] * config.B_max
        details.append({
            'metric_name': 'turn_magnitude',
            'raw_value': turn_magnitude,
            'normalized_value': b1_norm,
            'points_contribution': b1_contrib,
            'rule_text': f'Magnitud giro: abs(MA_change)/ATR = {turn_magnitude:.3f}'
        })
        scores.append(b1_norm)
    else:
        details.append({
            'metric_name': 'turn_magnitude',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # B2: turn_persistence
    ma_change = ma_short.diff()
    ma_change_score = ma_change.apply(lambda x: 1 if x > 0 else -1)
    ma_change_consecutive = ma_change_score.rolling(window=consecutive_periods).sum()
    persistence_raw = float(ma_change_consecutive.iloc[-1]) if pd.notna(ma_change_consecutive.iloc[-1]) else 0
    b2_norm = clamp(persistence_raw / consecutive_periods, 0.0, 1.0)
    b2_contrib = b2_norm * config.B_weights[1] * config.B_max
    details.append({
        'metric_name': 'turn_persistence',
        'raw_value': persistence_raw,
        'normalized_value': b2_norm,
        'points_contribution': b2_contrib,
        'rule_text': f'Persistencia: {persistence_raw}/{consecutive_periods} períodos consecutivos'
    })
    scores.append(b2_norm)
    
    # B3: extension_penalty
    if ma_short_actual is not None and atr_actual > 0:
        extension = (close_actual - ma_short_actual) / atr_actual
        if extension > config.B_extension_atr_limit2:
            b3_score = 0.0
        elif extension > config.B_extension_atr_limit:
            b3_score = 1.0 - minmax(extension, config.B_extension_atr_limit, config.B_extension_atr_limit2)
        else:
            b3_score = 1.0
        b3_contrib = b3_score * config.B_weights[2] * config.B_max
        details.append({
            'metric_name': 'extension_penalty',
            'raw_value': extension,
            'normalized_value': b3_score,
            'points_contribution': b3_contrib,
            'rule_text': f'Extensión: (Close-MA{ma_short_length})/ATR = {extension:.2f}'
        })
        scores.append(b3_score)
    else:
        details.append({
            'metric_name': 'extension_penalty',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    module_score = weighted_mean(scores, config.B_weights) * config.B_max
    
    return {
        'score': module_score,
        'max': config.B_max,
        'details': details
    }


def score_module_c_location(
    hist: pd.DataFrame,
    config: ScoringConfig
) -> Dict:
    """
    Módulo C - Ubicación en swing (0-20)
    """
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    
    if len(df) < config.C_swing_lookback:
        return {
            'score': 0.0,
            'max': config.C_max,
            'details': [{
                'metric_name': 'retracement',
                'raw_value': None,
                'normalized_value': 0.0,
                'points_contribution': 0.0,
                'rule_text': 'Datos insuficientes para calcular swing'
            }]
        }
    
    # Calcular swing high/low
    swing_high = float(df['High'].rolling(window=config.C_swing_lookback).max().iloc[-1])
    swing_low = float(df['Low'].rolling(window=config.C_swing_lookback).min().iloc[-1])
    swing_range = swing_high - swing_low
    
    if swing_range <= 0:
        return {
            'score': 0.0,
            'max': config.C_max,
            'details': [{
                'metric_name': 'retracement',
                'raw_value': None,
                'normalized_value': 0.0,
                'points_contribution': 0.0,
                'rule_text': f'Swing range inválido: {swing_range:.2f}'
            }]
        }
    
    # Calcular retracement
    retracement = (swing_high - close_actual) / swing_range
    retracement_pct = retracement * 100
    
    # Score usando peak window
    retracement_score = score_peak_window(
        retracement,
        config.C_retracement_ideal[0],
        config.C_retracement_ideal[1],
        config.C_retracement_ok[0],
        config.C_retracement_ok[1]
    )
    
    module_score = retracement_score * config.C_max
    
    return {
        'score': module_score,
        'max': config.C_max,
        'details': [{
            'metric_name': 'retracement',
            'raw_value': retracement,
            'normalized_value': retracement_score,
            'points_contribution': module_score,
            'rule_text': f'Retroceso: {retracement_pct:.1f}% (swing_high={swing_high:.2f}, swing_low={swing_low:.2f})'
        }]
    }


def score_module_d_risk(
    hist: pd.DataFrame,
    config: ScoringConfig,
    atr_series: pd.Series
) -> Dict:
    """
    Módulo D - Riesgo/Volatilidad/Liquidez (0-15)
    """
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    atr_actual = float(atr_series.iloc[-1])
    
    details = []
    scores = []
    
    # D1: ATR% score
    atr_percent = (atr_actual / close_actual) * 100
    if atr_percent <= config.D_target_atr_percent:
        d1_score = 1.0
    elif atr_percent >= config.D_max_atr_percent:
        d1_score = 0.0
    else:
        d1_score = 1.0 - minmax(atr_percent, config.D_target_atr_percent, config.D_max_atr_percent)
    d1_contrib = d1_score * config.D_weights[0] * config.D_max
    details.append({
        'metric_name': 'atr_percent',
        'raw_value': atr_percent,
        'normalized_value': d1_score,
        'points_contribution': d1_contrib,
        'rule_text': f'ATR% = {atr_percent:.2f}%'
    })
    scores.append(d1_score)
    
    # D2: Liquidez score
    dollar_volume = df['Volume'] * df['Close']
    dollar_volume_avg20 = float(dollar_volume.rolling(window=20).mean().iloc[-1]) if len(dollar_volume) >= 20 else None
    
    if dollar_volume_avg20 is not None:
        d2_score = minmax(dollar_volume_avg20, config.min_dollar_volume, config.D_good_dollar_volume)
        d2_contrib = d2_score * config.D_weights[1] * config.D_max
        details.append({
            'metric_name': 'liquidity',
            'raw_value': dollar_volume_avg20,
            'normalized_value': d2_score,
            'points_contribution': d2_contrib,
            'rule_text': f'Dollar volume avg20 = ${dollar_volume_avg20:,.0f}'
        })
        scores.append(d2_score)
    else:
        details.append({
            'metric_name': 'liquidity',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # D3: Stop cost
    stop_distance = 4 * atr_actual
    stop_cost_percent = (stop_distance / close_actual) * 100
    if stop_cost_percent <= config.D_stop_cost_target_percent:
        d3_score = 1.0
    elif stop_cost_percent >= config.D_stop_cost_max_percent:
        d3_score = 0.0
    else:
        d3_score = 1.0 - minmax(stop_cost_percent, config.D_stop_cost_target_percent, config.D_stop_cost_max_percent)
    d3_contrib = d3_score * config.D_weights[2] * config.D_max
    details.append({
        'metric_name': 'stop_cost',
        'raw_value': stop_cost_percent,
        'normalized_value': d3_score,
        'points_contribution': d3_contrib,
        'rule_text': f'Stop cost (4*ATR) = {stop_cost_percent:.2f}%'
    })
    scores.append(d3_score)
    
    module_score = weighted_mean(scores, config.D_weights) * config.D_max
    
    return {
        'score': module_score,
        'max': config.D_max,
        'details': details
    }


def score_module_e_demand(
    hist: pd.DataFrame,
    config: ScoringConfig
) -> Dict:
    """
    Módulo E - Confirmación de demanda (0-20)
    """
    df = hist.copy()
    last = df.iloc[-1]
    close_actual = float(last['Close'])
    high_actual = float(last['High'])
    low_actual = float(last['Low'])
    
    details = []
    scores = []
    
    # E1: close_strength
    if high_actual != low_actual:
        close_position = (close_actual - low_actual) / (high_actual - low_actual)
    else:
        close_position = 0.5
    e1_score = minmax(close_position, config.E_close_strength_range[0], config.E_close_strength_range[1])
    e1_contrib = e1_score * config.E_weights[0] * config.E_max
    details.append({
        'metric_name': 'close_strength',
        'raw_value': close_position,
        'normalized_value': e1_score,
        'points_contribution': e1_contrib,
        'rule_text': f'Close position = {close_position:.2f} (0=Low, 1=High)'
    })
    scores.append(e1_score)
    
    # E2: breakout_score
    if len(df) >= config.E_breakout_confirm_lookback:
        max_high_20 = float(df['High'].rolling(window=config.E_breakout_confirm_lookback).max().iloc[-1])
        breakout = close_actual > max_high_20
        e2_score = 1.0 if breakout else 0.0
        e2_contrib = e2_score * config.E_weights[1] * config.E_max
        details.append({
            'metric_name': 'breakout_score',
            'raw_value': 1 if breakout else 0,
            'normalized_value': e2_score,
            'points_contribution': e2_contrib,
            'rule_text': f'Breakout 20: Close ({close_actual:.2f}) {" > " if breakout else " <= "} max(High,20) ({max_high_20:.2f})'
        })
        scores.append(e2_score)
    else:
        details.append({
            'metric_name': 'breakout_score',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    # E3: volume_relative
    if len(df) >= 20:
        volume_avg20 = float(df['Volume'].rolling(window=20).mean().iloc[-1])
        volume_actual = float(last['Volume'])
        vol_rel = volume_actual / volume_avg20 if volume_avg20 > 0 else 1.0
        
        if vol_rel >= config.E_volume_relative_good:
            e3_score = 1.0
        elif vol_rel <= config.E_volume_relative_bad:
            e3_score = 0.0
        else:
            e3_score = minmax(vol_rel, config.E_volume_relative_bad, config.E_volume_relative_good)
        
        e3_contrib = e3_score * config.E_weights[2] * config.E_max
        details.append({
            'metric_name': 'volume_relative',
            'raw_value': vol_rel,
            'normalized_value': e3_score,
            'points_contribution': e3_contrib,
            'rule_text': f'Volume relativo = {vol_rel:.2f}x promedio 20'
        })
        scores.append(e3_score)
    else:
        details.append({
            'metric_name': 'volume_relative',
            'raw_value': None,
            'normalized_value': 0.0,
            'points_contribution': 0.0,
            'rule_text': 'No se pudo calcular'
        })
        scores.append(0.0)
    
    module_score = weighted_mean(scores, config.E_weights) * config.E_max
    
    return {
        'score': module_score,
        'max': config.E_max,
        'details': details
    }


def score_module_f_timefit(
    hist: pd.DataFrame,
    config: ScoringConfig,
    atr_series: pd.Series,
    entry_proxy: float
) -> Dict:
    """
    Módulo F - Time-Fit 4-6 semanas (0-15)
    """
    df = hist.copy()
    atr_actual = float(atr_series.iloc[-1])
    
    # Calcular ER
    er_series = calculate_er(df, config.F_er_lookback)
    er_actual = float(er_series.iloc[-1]) if pd.notna(er_series.iloc[-1]) else config.F_er_floor
    er_actual = max(er_actual, config.F_er_floor)
    
    # Calcular TP y SL
    tp = entry_proxy + config.F_k_target * atr_actual
    sl = entry_proxy - config.F_stop_atr_mult * atr_actual
    dist_to_tp = tp - entry_proxy
    dist_to_tp_in_atr = dist_to_tp / atr_actual if atr_actual > 0 else 0
    
    # Expected bars to TP
    expected_bars_to_tp = dist_to_tp_in_atr / er_actual if er_actual > 0 else 0
    expected_weeks_to_tp = expected_bars_to_tp / 5.0
    
    # Score usando peak window
    timefit_score = score_peak_window(
        expected_bars_to_tp,
        config.F_ideal_bars[0],
        config.F_ideal_bars[1],
        config.F_ok_bars[0],
        config.F_ok_bars[1]
    )
    
    module_score = timefit_score * config.F_max
    
    return {
        'score': module_score,
        'max': config.F_max,
        'details': [{
            'metric_name': 'timefit',
            'raw_value': expected_bars_to_tp,
            'normalized_value': timefit_score,
            'points_contribution': module_score,
            'rule_text': f'Expected bars to TP: {expected_bars_to_tp:.1f} ({expected_weeks_to_tp:.1f} semanas)'
        }],
        'forecast_data': {
            'entry': entry_proxy,
            'atr14': atr_actual,
            'k_target': config.F_k_target,
            'stop_atr_mult': config.F_stop_atr_mult,
            'tp': tp,
            'sl': sl,
            'er_lookback': config.F_er_lookback,
            'er': er_actual,
            'expected_bars_to_tp': expected_bars_to_tp,
            'expected_weeks_to_tp': expected_weeks_to_tp
        }
    }


# ============================================================================
# FUNCIÓN PRINCIPAL DE SCORING
# ============================================================================

def calculate_technical_score(
    hist: pd.DataFrame,
    ma_short_length: int,
    consecutive_periods: int,
    signal_type: str,
    config: Optional[ScoringConfig] = None
) -> Dict:
    """
    Calcula el score técnico completo (0-100) con todos los módulos.
    """
    if config is None:
        config = ScoringConfig()
    
    # Calcular ATR y ER una vez
    atr_series = calculate_atr(hist, config.atr_period)
    
    # Verificar gates
    gates_result = check_gates(hist, config, ma_short_length)
    
    # Si fallan los gates, score = 0
    if not gates_result['pass']:
        return {
            'gates': gates_result,
            'score': {
                'final': 0.0,
                'modules': {}
            },
            'raw_metrics': {},
            'normalized_metrics': {},
            'forecast': {},
            'explain': {
                'summary': [f"Gates fallidos: {', '.join([g['id'] for g in gates_result['details'] if not g['pass']])}"],
                'module_explanations': {}
            }
        }
    
    # Calcular entry_proxy (Close de la última vela)
    entry_proxy = float(hist['Close'].iloc[-1])
    
    # Calcular todos los módulos
    module_a = score_module_a_trend(hist, config, atr_series)
    module_b = score_module_b_turn_quality(hist, config, atr_series, ma_short_length, consecutive_periods)
    module_c = score_module_c_location(hist, config)
    module_d = score_module_d_risk(hist, config, atr_series)
    module_e = score_module_e_demand(hist, config)
    module_f = score_module_f_timefit(hist, config, atr_series, entry_proxy)
    
    # Score final
    final_score = (
        module_a['score'] +
        module_b['score'] +
        module_c['score'] +
        module_d['score'] +
        module_e['score'] +
        module_f['score']
    )
    
    # Recolectar métricas raw y normalized
    raw_metrics = {}
    normalized_metrics = {}
    
    # Extraer métricas de cada módulo
    for module_name, module_data in [
        ('A_trend', module_a),
        ('B_turn_quality', module_b),
        ('C_location', module_c),
        ('D_risk', module_d),
        ('E_demand', module_e),
        ('F_timefit', module_f)
    ]:
        for detail in module_data['details']:
            metric_key = f"{module_name}_{detail['metric_name']}"
            if detail['raw_value'] is not None:
                raw_metrics[metric_key] = detail['raw_value']
            normalized_metrics[metric_key] = detail['normalized_value']
    
    # Forecast data del módulo F
    forecast = module_f.get('forecast_data', {})
    
    # Generar explicaciones
    summary = []
    module_explanations = {}
    
    # Summary general
    summary.append(f"Score técnico final: {final_score:.1f}/100")
    summary.append(f"Módulo A (Tendencia): {module_a['score']:.1f}/{module_a['max']}")
    summary.append(f"Módulo B (Giro MA): {module_b['score']:.1f}/{module_b['max']}")
    summary.append(f"Módulo C (Ubicación): {module_c['score']:.1f}/{module_c['max']}")
    summary.append(f"Módulo D (Riesgo): {module_d['score']:.1f}/{module_d['max']}")
    summary.append(f"Módulo E (Demanda): {module_e['score']:.1f}/{module_e['max']}")
    summary.append(f"Módulo F (Time-Fit): {module_f['score']:.1f}/{module_f['max']}")
    
    # Explicación módulo F (crítico)
    if 'forecast_data' in module_f:
        fd = module_f['forecast_data']
        module_explanations['F_timefit'] = {
            'why': f"TP a {fd['k_target']} ATR; SL a {fd['stop_atr_mult']} ATR. ER({fd['er_lookback']})={fd['er']:.3f}. Expected bars to TP={fd['expected_bars_to_tp']:.1f} => {fd['expected_weeks_to_tp']:.1f} semanas. Encaje 4-6 semanas: {'alto' if 20 <= fd['expected_bars_to_tp'] <= 30 else 'medio' if 15 <= fd['expected_bars_to_tp'] <= 40 else 'bajo'}",
            'calc': {
                'tp_minus_entry': f"{fd['tp']:.2f} - {fd['entry']:.2f} = {fd['tp'] - fd['entry']:.2f}",
                'dist_in_atr': fd['k_target'],
                'er': fd['er'],
                'expected_bars': fd['expected_bars_to_tp']
            }
        }
    
    return {
        'gates': gates_result,
        'score': {
            'final': final_score,
            'modules': {
                'A_trend': module_a,
                'B_turn_quality': module_b,
                'C_location': module_c,
                'D_risk': module_d,
                'E_demand': module_e,
                'F_timefit': module_f
            }
        },
        'raw_metrics': raw_metrics,
        'normalized_metrics': normalized_metrics,
        'forecast': forecast,
        'explain': {
            'summary': summary,
            'module_explanations': module_explanations
        }
    }


# ============================================================================
# FUNCIONES ORIGINALES (mantenidas para compatibilidad)
# ============================================================================

def validar_timeframe(timeframe: str) -> bool:
    """
    Valida que el timeframe sea válido para yfinance.
    
    Args:
        timeframe: String con el timeframe (ej: '1d', '1h', '1m')
    
    Returns:
        True si es válido, False en caso contrario
    """
    timeframes_validos = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', 
                         '1h', '1d', '5d', '1wk', '1mo', '3mo']
    return timeframe.lower() in timeframes_validos


def descargar_historico(ticker: str, interval: str) -> Optional[tuple]:
    """
    Descarga el histórico máximo de un ticker desde Yahoo Finance.
    
    Args:
        ticker: Símbolo del ticker (ej: 'AAPL', 'BTC-USD')
        interval: Intervalo temporal (ej: '1d', '1h')
    
    Returns:
        Tupla (ticker_obj, hist) con el objeto Ticker y el DataFrame histórico, o None si hay error
    """
    try:
        ticker_obj = yf.Ticker(ticker)
        hist = ticker_obj.history(period="max", interval=interval)
        
        if hist.empty:
            return None
        
        return (ticker_obj, hist)
    except Exception as e:
        return None


def calcular_ath(ticker_obj: yf.Ticker, hist: pd.DataFrame) -> Optional[dict]:
    """
    Calcula el All-Time High y las métricas relacionadas.
    
    Args:
        ticker_obj: Objeto Ticker de yfinance
        hist: DataFrame con los datos históricos
    
    Returns:
        Diccionario con las métricas calculadas (valores serializables a JSON)
    """
    if hist.empty:
        return None
    
    # Obtener precio actual (último precio de cierre)
    precio_actual = float(hist['Close'].iloc[-1])
    
    # Calcular el máximo histórico (ATH)
    ath_precio = float(hist['High'].max())
    
    # Encontrar la fecha del ATH
    fecha_ath = hist[hist['High'] == ath_precio].index[0]
    
    # Calcular tiempo transcurrido desde el ATH
    fecha_actual = hist.index[-1]
    tiempo_transcurrido = fecha_actual - fecha_ath
    
    # Calcular drawdown desde el ATH
    drawdown_ath = float(((ath_precio - precio_actual) / ath_precio) * 100)
    
    # Obtener información adicional del ticker
    try:
        info = ticker_obj.info
        nombre = info.get('longName', ticker_obj.ticker)
    except:
        nombre = ticker_obj.ticker
    
    return {
        'ticker': ticker_obj.ticker,
        'nombre': nombre,
        'precio_actual': precio_actual,
        'ath_precio': ath_precio,
        'fecha_ath': str(fecha_ath),
        'fecha_actual': str(fecha_actual),
        'tiempo_transcurrido_dias': tiempo_transcurrido.days,
        'drawdown_ath': drawdown_ath,
        'periodo_analizado_inicio': str(hist.index[0]),
        'periodo_analizado_fin': str(hist.index[-1]),
        'total_registros': len(hist)
    }


def analyze_moving_average(
    hist: pd.DataFrame,
    ma_length: int,
    consecutive_periods: int
) -> dict:
    """
    Analiza la media móvil de un conjunto de datos históricos.
    
    Args:
        hist: DataFrame con los datos históricos (debe incluir columna 'Close')
        ma_length: Longitud de la media móvil (ej: 20, 50, 200)
        consecutive_periods: Cantidad de períodos consecutivos necesarios para declarar cambio de tendencia
    
    Returns:
        Diccionario con información de la media móvil y la señal de la última vela
    """
    # Crear copia del DataFrame para no modificar el original
    df = hist.copy()
    
    # Calcular la media móvil usando el precio de cierre
    df[f'MA_{ma_length}'] = df['Close'].rolling(window=ma_length).mean()

    df[f'MA_{ma_length}_change'] = df[f'MA_{ma_length}'].diff()
    df[f'MA_{ma_length}_change_score'] = df[f'MA_{ma_length}_change'].apply(lambda x: 1 if x > 0 else -1)
    df[f'MA_{ma_length}_change_score_consecutive'] = df[f'MA_{ma_length}_change_score'].rolling(window=consecutive_periods).sum()
    df[f'MA_{ma_length}_change_score_consecutive_previous'] = df[f'MA_{ma_length}_change_score_consecutive'].shift(1)
    
    # Detectar cambio de tendencia alcista: consecutive_periods períodos consecutivos positivos
    # donde el período anterior no cumplía esta condición
    signal_alcista = (
        (df[f'MA_{ma_length}_change_score_consecutive'] == consecutive_periods) &
        (df[f'MA_{ma_length}_change_score_consecutive_previous'] != consecutive_periods)
    )
    
    # Detectar cambio de tendencia bajista: consecutive_periods períodos consecutivos negativos
    # donde el período anterior no cumplía esta condición
    signal_bajista = (
        (df[f'MA_{ma_length}_change_score_consecutive'] == -consecutive_periods) &
        (df[f'MA_{ma_length}_change_score_consecutive_previous'] != -consecutive_periods)
    )
    
    # Crear columna de señal: 1 para alcista, -1 para bajista, 0 para sin señal
    df[f'MA_{ma_length}_signal'] = 0
    df.loc[signal_alcista, f'MA_{ma_length}_signal'] = 1
    df.loc[signal_bajista, f'MA_{ma_length}_signal'] = -1
    
    # Obtener información de la última vela
    ultima_vela = df.iloc[-1]
    ultima_senal = int(ultima_vela[f'MA_{ma_length}_signal'])
    
    # Determinar el tipo de señal
    if ultima_senal == 1:
        tipo_senal = 'alcista'
    elif ultima_senal == -1:
        tipo_senal = 'bajista'
    else:
        tipo_senal = 'sin_senal'
    
    # Obtener valores de la última vela
    ma_actual = ultima_vela[f'MA_{ma_length}']
    precio_actual = ultima_vela['Close']
    fecha_ultima_vela = df.index[-1]
    
    return {
        'ma_length': ma_length,
        'consecutive_periods': consecutive_periods,
        'media_movil_actual': float(ma_actual) if pd.notna(ma_actual) else None,
        'precio_actual': float(precio_actual),
        'fecha_ultima_vela': str(fecha_ultima_vela),
        'senal_ultima_vela': ultima_senal,
        'tipo_senal': tipo_senal,
        'hay_senal': ultima_senal != 0
    }


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Analiza el All-Time High (ATH) de un ticker desde Yahoo Finance',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python analysis.py AAPL --timeframe 1d
  python analysis.py BTC-USD --timeframe 1d
  python analysis.py TSLA --timeframe 1wk
  
Timeframes válidos: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
        """
    )
    
    parser.add_argument(
        'ticker',
        type=str,
        help='Símbolo del ticker a analizar (ej: AAPL, BTC-USD, TSLA)'
    )
    
    parser.add_argument(
        '--timeframe', '-t',
        type=str,
        default='1d',
        help='Temporalidad/intervalo de los datos (default: 1d)'
    )

    parser.add_argument(
        '--ma_length', '-m',
        type=int,
        default=21,
        help='Longitud de la media móvil (default: 21)'
    )

    parser.add_argument(
        '--consecutive_periods', '-c',
        type=int,
        default=3,
        help='Cantidad de períodos consecutivos necesarios para declarar cambio de tendencia (default: 3)'
    )
    
    args = parser.parse_args()
    
    # Validar timeframe
    if not validar_timeframe(args.timeframe):
        error_json = json.dumps({'error': f"Timeframe '{args.timeframe}' no es válido"})
        print(error_json)
        sys.exit(1)
    
    # Descargar histórico (solo una vez)
    resultado = descargar_historico(args.ticker, args.timeframe)
    
    if resultado is None:
        error_json = json.dumps({'error': f'No se pudieron descargar datos para el ticker {args.ticker}'})
        print(error_json)
        sys.exit(1)
    
    ticker_obj, hist = resultado
    
    # Calcular métricas usando los mismos datos
    metricas_ath = calcular_ath(ticker_obj, hist)
    
    if metricas_ath is None:
        error_json = json.dumps({'error': 'No se pudieron calcular las métricas del ATH'})
        print(error_json)
        sys.exit(1)
    
    # Analizar media móvil
    metricas_ma = analyze_moving_average(hist, args.ma_length, args.consecutive_periods)
    
    # Calcular score técnico (solo si hay señal y es timeframe 1d)
    technical_score_result = None
    if args.timeframe == '1d' and metricas_ma.get('hay_senal', False):
        config = ScoringConfig()
        technical_score_result = calculate_technical_score(
            hist,
            args.ma_length,
            args.consecutive_periods,
            metricas_ma.get('tipo_senal', 'sin_senal'),
            config
        )
    
    # Combinar todas las métricas en un solo JSON
    resultado_final = {
        'ticker': metricas_ath['ticker'],
        'timestamp': datetime.now().isoformat(),
        'ath': metricas_ath,
        'media_movil': metricas_ma,
        'signal': {
            'type': metricas_ma.get('tipo_senal', 'sin_senal'),
            'ma_length': args.ma_length,
            'consecutive_periods': args.consecutive_periods
        }
    }
    
    # Agregar technical_score si existe
    if technical_score_result is not None:
        resultado_final['technical_score'] = technical_score_result
    
    # Imprimir JSON final
    print(json.dumps(resultado_final, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()

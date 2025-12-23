#!/usr/bin/env python3
"""
Script para analizar el All-Time High (ATH) de un ticker desde Yahoo Finance.

Este script descarga el histórico máximo de un ticker, calcula el ATH,
determina cuánto tiempo ha pasado desde entonces y el drawdown desde el ATH.
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Optional

import pandas as pd
import yfinance as yf


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
        'fecha_ultima_vela': str(fecha_ultima_vela),  # Evita error con .strftime si el index no es datetime
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
    
    # Combinar todas las métricas en un solo JSON
    resultado_final = {
        'ath': metricas_ath,
        'media_movil': metricas_ma
    }
    
    # Imprimir JSON final
    print(json.dumps(resultado_final, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()

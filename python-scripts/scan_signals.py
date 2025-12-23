#!/usr/bin/env python3
"""
Script para escanear múltiples activos y filtrar aquellos con señal alcista.

Lee los archivos CSV de ETFs y stocks, ejecuta el análisis para cada activo
y filtra los resultados que tienen señal alcista en la media móvil.
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional

# Obtener la ruta del directorio donde está este script
SCRIPT_DIR = Path(__file__).parent.absolute()
DATA_DIR = SCRIPT_DIR.parent / 'data'
ANALYSIS_SCRIPT = SCRIPT_DIR / 'analysis.py'


def cargar_tickers_desde_csv(archivo_csv: Path) -> List[str]:
    """
    Carga los tickers desde un archivo CSV.
    
    Args:
        archivo_csv: Ruta al archivo CSV
    
    Returns:
        Lista de tickers únicos
    """
    tickers = []
    
    if not archivo_csv.exists():
        print(f"Advertencia: El archivo {archivo_csv} no existe", file=sys.stderr)
        return tickers
    
    try:
        with open(archivo_csv, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            
            # Determinar la columna de ticker según el tipo de archivo
            if 'etf_ticker' in fieldnames:
                ticker_col = 'etf_ticker'
            elif 'stock_ticker' in fieldnames:
                ticker_col = 'stock_ticker'
            else:
                print(f"Error: No se encontró columna de ticker en {archivo_csv}", file=sys.stderr)
                return tickers
            
            for row in reader:
                ticker = row.get(ticker_col, '').strip()
                if ticker:
                    tickers.append(ticker)
    
    except Exception as e:
        print(f"Error al leer {archivo_csv}: {e}", file=sys.stderr)
    
    return tickers


def ejecutar_analisis(
    ticker: str,
    timeframe: str,
    ma_length: int,
    consecutive_periods: int,
    script_path: Path = ANALYSIS_SCRIPT
) -> Optional[dict]:
    """
    Ejecuta el script de análisis para un ticker y retorna el resultado.
    
    Args:
        ticker: Símbolo del ticker
        timeframe: Intervalo temporal
        ma_length: Longitud de la media móvil
        consecutive_periods: Períodos consecutivos para cambio de tendencia
        script_path: Ruta al script de análisis
    
    Returns:
        Diccionario con los resultados o None si hay error
    """
    try:
        # Construir el comando
        cmd = [
            sys.executable,
            str(script_path),
            ticker,
            '--timeframe', timeframe,
            '--ma_length', str(ma_length),
            '--consecutive_periods', str(consecutive_periods)
        ]
        
        # Ejecutar el script
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # Timeout de 60 segundos
        )
        
        if result.returncode != 0:
            return None
        
        # Parsear el JSON de salida
        output = result.stdout.strip()
        if not output:
            return None
        
        try:
            resultado = json.loads(output)
            # Verificar si hay error en el JSON
            if 'error' in resultado:
                return None
            return resultado
        except json.JSONDecodeError:
            return None
    
    except subprocess.TimeoutExpired:
        print(f"Timeout al analizar {ticker}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON para {ticker}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error al ejecutar análisis para {ticker}: {e}", file=sys.stderr)
        return None


def tiene_senal_alcista(resultado: dict) -> bool:
    """
    Verifica si un resultado tiene señal alcista.
    
    Args:
        resultado: Diccionario con los resultados del análisis
    
    Returns:
        True si tiene señal alcista, False en caso contrario
    """
    if 'error' in resultado:
        return False
    
    media_movil = resultado.get('media_movil', {})
    hay_senal = media_movil.get('hay_senal', False)
    tipo_senal = media_movil.get('tipo_senal', '')
    
    return hay_senal and tipo_senal == 'alcista'


def escanear_activos(
    tickers: List[str],
    timeframe: str,
    ma_length: int,
    consecutive_periods: int,
    delay_seconds: float = 1.0,
    max_errors: int = 10
) -> List[dict]:
    """
    Escanea múltiples activos y retorna solo los que tienen señal alcista.
    
    Args:
        tickers: Lista de tickers a analizar
        timeframe: Intervalo temporal
        ma_length: Longitud de la media móvil
        consecutive_periods: Períodos consecutivos para cambio de tendencia
        delay_seconds: Segundos de espera entre requests
        max_errors: Número máximo de errores consecutivos antes de detenerse
    
    Returns:
        Lista de resultados con señal alcista
    """
    resultados_alcistas = []
    errores_consecutivos = 0
    total = len(tickers)
    
    print(f"Escaneando {total} activos...", file=sys.stderr)
    print(f"Delay entre requests: {delay_seconds} segundos", file=sys.stderr)
    print(file=sys.stderr)
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i}/{total}] Analizando {ticker}...", file=sys.stderr, end=' ')
        
        resultado = ejecutar_analisis(
            ticker,
            timeframe,
            ma_length,
            consecutive_periods
        )
        
        if resultado is None:
            errores_consecutivos += 1
            print("ERROR", file=sys.stderr)
            
            if errores_consecutivos >= max_errors:
                print(f"\nSe alcanzó el límite de {max_errors} errores consecutivos. Deteniendo...", file=sys.stderr)
                break
        else:
            errores_consecutivos = 0  # Resetear contador de errores
            
            if tiene_senal_alcista(resultado):
                resultados_alcistas.append(resultado)
                print("✓ SEÑAL ALCISTA", file=sys.stderr)
            else:
                print("Sin señal", file=sys.stderr)
        
        # Esperar antes del siguiente request (excepto en el último)
        if i < total and delay_seconds > 0:
            time.sleep(delay_seconds)
    
    return resultados_alcistas


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Escanea múltiples activos y filtra aquellos con señal alcista',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scan_signals.py
  python scan_signals.py --timeframe 1wk --ma_length 50
  python scan_signals.py --delay 2.0 --max_errors 5
  python scan_signals.py --only-etfs
  python scan_signals.py --only-stocks
        """
    )
    
    # Parámetros del análisis (los mismos que analysis.py)
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
    
    # Parámetros de configuración del escaneo
    parser.add_argument(
        '--delay', '-d',
        type=float,
        default=1.0,
        help='Segundos de espera entre requests para evitar bloqueos (default: 1.0)'
    )
    
    parser.add_argument(
        '--max_errors',
        type=int,
        default=10,
        help='Número máximo de errores consecutivos antes de detenerse (default: 10)'
    )
    
    # Opciones de filtrado de activos
    parser.add_argument(
        '--only-etfs',
        action='store_true',
        help='Solo analizar ETFs'
    )
    
    parser.add_argument(
        '--only-stocks',
        action='store_true',
        help='Solo analizar stocks'
    )
    
    args = parser.parse_args()
    
    # Validar argumentos incompatibles
    if args.only_etfs and args.only_stocks:
        print("Error: No se pueden usar --only-etfs y --only-stocks al mismo tiempo", file=sys.stderr)
        sys.exit(1)
    
    # Cargar tickers
    tickers = []
    
    if not args.only_stocks:
        etfs_csv = DATA_DIR / 'etfs.csv'
        tickers_etfs = cargar_tickers_desde_csv(etfs_csv)
        tickers.extend(tickers_etfs)
        print(f"Cargados {len(tickers_etfs)} ETFs", file=sys.stderr)
    
    if not args.only_etfs:
        stocks_csv = DATA_DIR / 'stocks.csv'
        tickers_stocks = cargar_tickers_desde_csv(stocks_csv)
        tickers.extend(tickers_stocks)
        print(f"Cargados {len(tickers_stocks)} stocks", file=sys.stderr)
    
    if not tickers:
        error_json = json.dumps({'error': 'No se encontraron tickers para analizar'})
        print(error_json)
        sys.exit(1)
    
    # Eliminar duplicados manteniendo el orden
    tickers = list(dict.fromkeys(tickers))
    
    # Ejecutar escaneo
    resultados = escanear_activos(
        tickers,
        args.timeframe,
        args.ma_length,
        args.consecutive_periods,
        args.delay,
        args.max_errors
    )
    
    # Preparar resultado final
    resultado_final = {
        'total_analizados': len(tickers),
        'con_senal_alcista': len(resultados),
        'resultados': resultados
    }
    
    # Imprimir JSON final (sin mensajes de stderr)
    print(json.dumps(resultado_final, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()


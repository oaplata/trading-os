#!/usr/bin/env python3
"""
Script para escanear múltiples activos y filtrar aquellos con señal alcista.

Lee el archivo JSON con datos completos de acciones, ejecuta el análisis para cada activo
y filtra los resultados que tienen señal alcista en la media móvil.
Guarda los resultados en un archivo JSON.
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# Obtener la ruta del directorio donde está este script
SCRIPT_DIR = Path(__file__).parent.absolute()
HTML_DIR = SCRIPT_DIR.parent / 'html'
ANALYSIS_SCRIPT = SCRIPT_DIR / 'analysis.py'


def cargar_tickers_desde_json(archivo_json: Path) -> List[str]:
    """
    Carga los tickers desde un archivo JSON con estructura de sectores/industrias/acciones.
    
    Args:
        archivo_json: Ruta al archivo JSON
    
    Returns:
        Lista de tickers únicos
    """
    tickers = []
    
    if not archivo_json.exists():
        print(f"Advertencia: El archivo {archivo_json} no existe", file=sys.stderr)
        return tickers
    
    try:
        with open(archivo_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
            # Recorrer la estructura: sectores -> industrias -> acciones
            sectores = data.get('sectores', [])
            
            for sector in sectores:
                industrias = sector.get('industrias', [])
                
                for industria in industrias:
                    acciones = industria.get('acciones', [])
                    
                    for accion in acciones:
                        ticker = accion.get('ticker', '').strip()
                        if ticker:
                            tickers.append(ticker)
    
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON {archivo_json}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Error al leer {archivo_json}: {e}", file=sys.stderr)
    
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
  python scan_signals.py --json-file datos_completos_20251222_201817.json
  python scan_signals.py --output mis_resultados.json
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
    
    # Opción para especificar el archivo JSON
    parser.add_argument(
        '--json-file', '-j',
        type=str,
        default='datos_completos_20251222_201817.json',
        help='Nombre del archivo JSON en el directorio html/ (default: datos_completos_20251222_201817.json)'
    )
    
    # Opción para especificar el archivo de salida
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Nombre del archivo JSON de salida (default: resultados_YYYYMMDD_HHMMSS.json)'
    )
    
    args = parser.parse_args()
    
    # Cargar tickers desde JSON
    json_file = HTML_DIR / args.json_file
    tickers = cargar_tickers_desde_json(json_file)
    
    if not tickers:
        error_json = json.dumps({'error': 'No se encontraron tickers para analizar'}, indent=2, ensure_ascii=False)
        print(error_json, file=sys.stderr)
        sys.exit(1)
    
    # Eliminar duplicados manteniendo el orden
    tickers = list(dict.fromkeys(tickers))
    print(f"Cargados {len(tickers)} tickers desde {args.json_file}", file=sys.stderr)
    
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
        'fecha_analisis': datetime.now().isoformat(),
        'parametros': {
            'timeframe': args.timeframe,
            'ma_length': args.ma_length,
            'consecutive_periods': args.consecutive_periods,
            'delay_seconds': args.delay,
            'max_errors': args.max_errors
        },
        'estadisticas': {
            'total_analizados': len(tickers),
            'con_senal_alcista': len(resultados),
            'sin_senal': len(tickers) - len(resultados)
        },
        'resultados': resultados
    }
    
    # Determinar nombre del archivo de salida
    if args.output:
        output_file = Path(args.output)
    else:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = SCRIPT_DIR / f'resultados_{timestamp}.json'
    
    # Guardar resultados en archivo JSON
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(resultado_final, f, indent=2, ensure_ascii=False)
        print(f"\nResultados guardados en: {output_file}", file=sys.stderr)
        print(f"Total analizados: {len(tickers)}", file=sys.stderr)
        print(f"Con señal alcista: {len(resultados)}", file=sys.stderr)
    except Exception as e:
        print(f"Error al guardar resultados: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()


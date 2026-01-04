#!/usr/bin/env python3
"""
Script para escanear acciones de Quantfury y ETFs.

Lee stocks.json y filtra solo acciones de NYSE y NASDAQ, ordenadas por market cap (mayor a menor).
Lee etfs.json sin filtrar.
Ejecuta el análisis para cada una y guarda los resultados en un archivo JSON.
Muestra progreso en consola.
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

# Obtener la ruta del directorio donde está este script
SCRIPT_DIR = Path(__file__).parent.absolute()
QUANTFURY_DIR = SCRIPT_DIR.parent / 'quantfury'
ANALYSIS_SCRIPT = SCRIPT_DIR / 'analysis.py'


def cargar_stocks_filtrados(stocks_file: Path) -> List[Dict]:
    """
    Carga las acciones desde stocks.json y filtra solo las de NYSE y NASDAQ.
    Retorna la lista ordenada por market cap (mayor a menor).
    
    Args:
        stocks_file: Ruta al archivo stocks.json
    
    Returns:
        Lista de diccionarios con acciones filtradas y ordenadas
    """
    if not stocks_file.exists():
        print(f"Error: El archivo {stocks_file} no existe", file=sys.stderr)
        return []
    
    try:
        with open(stocks_file, 'r', encoding='utf-8') as f:
            stocks = json.load(f)
        
        # Filtrar solo NYSE y NASDAQ
        stocks_filtradas = [
            stock for stock in stocks
            if stock.get('exchange') in ['NYSE', 'NASDAQ']
            and stock.get('error') is None  # Excluir acciones con error
        ]
        
        # Ordenar por market cap (mayor a menor), las que no tienen market cap van al final
        stocks_filtradas.sort(
            key=lambda x: x.get('marketCap') if x.get('marketCap') is not None else 0,
            reverse=True
        )
        
        return stocks_filtradas
    
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON {stocks_file}: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error al leer {stocks_file}: {e}", file=sys.stderr)
        return []


def cargar_etfs(etfs_file: Path) -> List[Dict]:
    """
    Carga los ETFs desde etfs.json sin aplicar filtros.
    
    Args:
        etfs_file: Ruta al archivo etfs.json
    
    Returns:
        Lista de diccionarios con ETFs
    """
    if not etfs_file.exists():
        print(f"Error: El archivo {etfs_file} no existe", file=sys.stderr)
        return []
    
    try:
        with open(etfs_file, 'r', encoding='utf-8') as f:
            etfs = json.load(f)
        
        return etfs
    
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON {etfs_file}: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error al leer {etfs_file}: {e}", file=sys.stderr)
        return []


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
        return None
    except Exception as e:
        return None


def escanear_activos(
    items: List[Dict],
    tipo: str,
    timeframe: str,
    ma_length: int,
    consecutive_periods: int,
    delay_seconds: float = 1.0,
    max_errors: int = 10
) -> Dict:
    """
    Escanea múltiples activos y retorna los resultados del análisis con estadísticas.
    
    Args:
        items: Lista de diccionarios con información de los activos
        tipo: Tipo de activo ('stocks' o 'etfs')
        timeframe: Intervalo temporal
        ma_length: Longitud de la media móvil
        consecutive_periods: Períodos consecutivos para cambio de tendencia
        delay_seconds: Segundos de espera entre requests
        max_errors: Número máximo de errores consecutivos antes de detenerse
    
    Returns:
        Diccionario con 'resultados' (lista) y 'estadisticas' (dict)
    """
    resultados = []
    errores_consecutivos = 0
    total = len(items)
    total_analizados = 0
    total_exitosos = 0
    total_errores = 0
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Escaneando {total} {tipo.upper()}...", file=sys.stderr)
    print(f"Delay entre requests: {delay_seconds} segundos", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)
    
    for i, item in enumerate(items, 1):
        ticker = item.get('ticker', '')
        nombre = item.get('name', '')
        total_analizados += 1
        
        # Mostrar información adicional para stocks
        if tipo == 'stocks':
            exchange = item.get('exchange', '')
            market_cap = item.get('marketCap')
            if market_cap:
                market_cap_str = f"${market_cap/1e9:.2f}B"
            else:
                market_cap_str = "N/A"
            print(f"[{i}/{total}] {ticker} ({exchange}) - Market Cap: {market_cap_str} - {nombre[:50]}...", 
                  file=sys.stderr, end=' ')
        else:
            print(f"[{i}/{total}] {ticker} - {nombre[:50]}...", file=sys.stderr, end=' ')
        
        resultado = ejecutar_analisis(
            ticker,
            timeframe,
            ma_length,
            consecutive_periods
        )
        
        if resultado is None:
            errores_consecutivos += 1
            total_errores += 1
            print("ERROR", file=sys.stderr)
            
            if errores_consecutivos >= max_errors:
                print(f"\nSe alcanzó el límite de {max_errors} errores consecutivos. Deteniendo...", file=sys.stderr)
                break
        else:
            errores_consecutivos = 0  # Resetear contador de errores
            total_exitosos += 1
            resultados.append(resultado)
            print("OK", file=sys.stderr)
        
        # Esperar antes del siguiente request (excepto en el último)
        if i < total and delay_seconds > 0:
            time.sleep(delay_seconds)
    
    return {
        'resultados': resultados,
        'estadisticas': {
            'total_analizados': total_analizados,
            'exitosos': total_exitosos,
            'errores': total_errores
        }
    }


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Escanea acciones de Quantfury (NYSE/NASDAQ) y ETFs, ejecuta análisis y guarda resultados',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scan_quantfury.py
  python scan_quantfury.py --timeframe 1wk --ma_length 50
  python scan_quantfury.py --delay 2.0 --max_errors 5
  python scan_quantfury.py --output mis_resultados.json
  python scan_quantfury.py --skip-etfs
  python scan_quantfury.py --skip-stocks
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
    
    # Opciones para especificar archivos
    parser.add_argument(
        '--stocks-file',
        type=str,
        default='stocks.json',
        help='Nombre del archivo de stocks en quantfury/ (default: stocks.json)'
    )
    
    parser.add_argument(
        '--etfs-file',
        type=str,
        default='etfs.json',
        help='Nombre del archivo de ETFs en quantfury/ (default: etfs.json)'
    )
    
    # Opción para especificar el archivo de salida
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Nombre del archivo JSON de salida (default: resultados_quantfury_YYYYMMDD_HHMMSS.json)'
    )
    
    # Opciones para omitir stocks o etfs
    parser.add_argument(
        '--skip-stocks',
        action='store_true',
        help='Omitir el análisis de stocks'
    )
    
    parser.add_argument(
        '--skip-etfs',
        action='store_true',
        help='Omitir el análisis de ETFs'
    )
    
    args = parser.parse_args()
    
    # Inicializar resultados
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
            'stocks': {
                'total_filtrados': 0,
                'total_analizados': 0,
                'exitosos': 0,
                'errores': 0
            },
            'etfs': {
                'total': 0,
                'analizados': 0,
                'exitosos': 0,
                'errores': 0
            }
        },
        'resultados': {
            'stocks': [],
            'etfs': []
        }
    }
    
    # Procesar stocks
    if not args.skip_stocks:
        stocks_file = QUANTFURY_DIR / args.stocks_file
        stocks = cargar_stocks_filtrados(stocks_file)
        
        if stocks:
            resultado_final['estadisticas']['stocks']['total_filtrados'] = len(stocks)
            print(f"\nCargadas {len(stocks)} acciones de NYSE/NASDAQ desde {args.stocks_file}", file=sys.stderr)
            
            resultado_stocks = escanear_activos(
                stocks,
                'stocks',
                args.timeframe,
                args.ma_length,
                args.consecutive_periods,
                args.delay,
                args.max_errors
            )
            
            resultado_final['resultados']['stocks'] = resultado_stocks['resultados']
            resultado_final['estadisticas']['stocks'].update(resultado_stocks['estadisticas'])
        else:
            print(f"No se encontraron acciones válidas en {args.stocks_file}", file=sys.stderr)
    
    # Procesar ETFs
    if not args.skip_etfs:
        etfs_file = QUANTFURY_DIR / args.etfs_file
        etfs = cargar_etfs(etfs_file)
        
        if etfs:
            resultado_final['estadisticas']['etfs']['total'] = len(etfs)
            print(f"\nCargados {len(etfs)} ETFs desde {args.etfs_file}", file=sys.stderr)
            
            resultado_etfs = escanear_activos(
                etfs,
                'etfs',
                args.timeframe,
                args.ma_length,
                args.consecutive_periods,
                args.delay,
                args.max_errors
            )
            
            resultado_final['resultados']['etfs'] = resultado_etfs['resultados']
            resultado_final['estadisticas']['etfs']['analizados'] = resultado_etfs['estadisticas']['total_analizados']
            resultado_final['estadisticas']['etfs']['exitosos'] = resultado_etfs['estadisticas']['exitosos']
            resultado_final['estadisticas']['etfs']['errores'] = resultado_etfs['estadisticas']['errores']
        else:
            print(f"No se encontraron ETFs en {args.etfs_file}", file=sys.stderr)
    
    # Determinar nombre del archivo de salida
    if args.output:
        output_file = Path(args.output)
    else:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = SCRIPT_DIR / f'resultados_quantfury_{timestamp}.json'
    
    # Guardar resultados en archivo JSON
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(resultado_final, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Resultados guardados en: {output_file}", file=sys.stderr)
        print(f"\nResumen:", file=sys.stderr)
        if not args.skip_stocks:
            stats_stocks = resultado_final['estadisticas']['stocks']
            print(f"  Stocks: {stats_stocks['exitosos']}/{stats_stocks['total_filtrados']} analizados exitosamente", file=sys.stderr)
        if not args.skip_etfs:
            stats_etfs = resultado_final['estadisticas']['etfs']
            print(f"  ETFs: {stats_etfs['exitosos']}/{stats_etfs['total']} analizados exitosamente", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)
    except Exception as e:
        print(f"Error al guardar resultados: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()


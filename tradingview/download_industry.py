#!/usr/bin/env python3
"""
Script para descargar la página HTML de una industria específica de TradingView.

Lee un JSON con sectores e industrias y descarga el HTML de una industria específica.
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

import requests
from bs4 import BeautifulSoup


def descargar_pagina(url: str, user_agent: str = None) -> str:
    """
    Descarga el contenido HTML de una URL.
    
    Args:
        url: URL a descargar
        user_agent: User-Agent personalizado (opcional)
    
    Returns:
        Contenido HTML como string
    """
    headers = {
        'User-Agent': user_agent or (
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        print(f"Descargando: {url}", file=sys.stderr)
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Intentar decodificar con el encoding correcto
        response.encoding = response.apparent_encoding or 'utf-8'
        
        return response.text
    
    except requests.exceptions.RequestException as e:
        print(f"Error al descargar la página: {e}", file=sys.stderr)
        sys.exit(1)


def cargar_json(archivo_json: Path) -> dict:
    """
    Carga el JSON con los sectores e industrias.
    
    Args:
        archivo_json: Ruta al archivo JSON
    
    Returns:
        Diccionario con los datos del JSON
    """
    try:
        with open(archivo_json, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: No se encontró el archivo {archivo_json}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error al parsear el JSON: {e}", file=sys.stderr)
        sys.exit(1)


def guardar_html(html: str, archivo_salida: Path):
    """
    Guarda el HTML en un archivo.
    
    Args:
        html: Contenido HTML
        archivo_salida: Ruta del archivo de salida
    """
    try:
        archivo_salida.parent.mkdir(parents=True, exist_ok=True)
        
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            f.write(html)
        
        tamaño = archivo_salida.stat().st_size
        print(f"HTML guardado en: {archivo_salida}", file=sys.stderr)
        print(f"Tamaño: {tamaño:,} bytes ({tamaño/1024:.2f} KB)", file=sys.stderr)
    
    except Exception as e:
        print(f"Error al guardar el archivo: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Descarga el HTML de una industria específica desde el JSON de sectores',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  # Desde JSON, especificando sector e industria por índice
  python download_industry.py sectores.json --sector 0 --industria 0
  
  # Desde JSON, especificando solo el primer sector e industria
  python download_industry.py sectores.json
  
  # Especificar URL directamente
  python download_industry.py --url https://es.tradingview.com/markets/stocks-usa/sectorandindustry-industry/internet-software-services/
  
  # Con nombre de archivo personalizado
  python download_industry.py sectores.json --sector 0 --industria 0 --output industria.html
        """
    )
    
    parser.add_argument(
        'json_sectores',
        type=str,
        nargs='?',
        default=None,
        help='Archivo JSON con los sectores e industrias (opcional si se usa --url)'
    )
    
    parser.add_argument(
        '--url',
        type=str,
        default=None,
        help='URL directa de la industria a descargar'
    )
    
    parser.add_argument(
        '--sector', '-s',
        type=int,
        default=0,
        help='Índice del sector (default: 0, primer sector)'
    )
    
    parser.add_argument(
        '--industria', '-i',
        type=int,
        default=0,
        help='Índice de la industria dentro del sector (default: 0, primera industria)'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida (default: genera nombre automático basado en la industria)'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='html',
        help='Directorio donde guardar los archivos HTML (default: html)'
    )
    
    args = parser.parse_args()
    
    # Determinar URL a descargar
    if args.url:
        url_industria = args.url
        nombre_industria = 'industria'
    elif args.json_sectores:
        # Cargar JSON con sectores
        archivo_json = Path(args.json_sectores)
        datos = cargar_json(archivo_json)
        
        # Verificar que tenga sectores
        if 'sectores' not in datos or not datos['sectores']:
            print("Error: El JSON no contiene sectores", file=sys.stderr)
            sys.exit(1)
        
        sectores = datos['sectores']
        
        # Verificar que el índice del sector sea válido
        if args.sector < 0 or args.sector >= len(sectores):
            print(f"Error: Índice de sector {args.sector} fuera de rango. Hay {len(sectores)} sectores (0-{len(sectores)-1})", file=sys.stderr)
            sys.exit(1)
        
        sector = sectores[args.sector]
        nombre_sector = sector.get('nombre', f'Sector {args.sector}')
        
        # Verificar que tenga industrias
        if 'industrias' not in sector or not sector['industrias']:
            print(f"Error: El sector '{nombre_sector}' no tiene industrias", file=sys.stderr)
            sys.exit(1)
        
        industrias = sector['industrias']
        
        # Verificar que el índice de la industria sea válido
        if args.industria < 0 or args.industria >= len(industrias):
            print(f"Error: Índice de industria {args.industria} fuera de rango. Hay {len(industrias)} industrias (0-{len(industrias)-1})", file=sys.stderr)
            sys.exit(1)
        
        industria = industrias[args.industria]
        nombre_industria = industria.get('nombre', f'Industria {args.industria}')
        url_industria = industria.get('url_industria', '')
        
        if not url_industria:
            print(f"Error: La industria '{nombre_industria}' no tiene URL", file=sys.stderr)
            sys.exit(1)
        
        print(f"Sector: {nombre_sector}", file=sys.stderr)
        print(f"Industria: {nombre_industria}", file=sys.stderr)
    else:
        print("Error: Debe proporcionar --url o un archivo JSON con --sector y --industria", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    print(f"URL: {url_industria}", file=sys.stderr)
    
    # Generar nombre de archivo si no se especifica
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Crear nombre basado en la industria y timestamp
        output_dir = Path(args.output_dir)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Limpiar nombre de la industria para usar como nombre de archivo
        nombre_archivo = nombre_industria.lower().replace(' ', '_').replace(',', '').replace('.', '')
        nombre_archivo = ''.join(c for c in nombre_archivo if c.isalnum() or c == '_')
        
        archivo_salida = output_dir / f"industria_{nombre_archivo}_{timestamp}.html"
    
    # Descargar la página de la industria
    html = descargar_pagina(url_industria)
    
    # Guardar el HTML
    guardar_html(html, archivo_salida)
    
    print(f"\nResumen:", file=sys.stderr)
    print(f"  - Industria: {nombre_industria}", file=sys.stderr)
    print(f"  - URL: {url_industria}", file=sys.stderr)
    print(f"  - Archivo guardado: {archivo_salida}", file=sys.stderr)


if __name__ == '__main__':
    main()


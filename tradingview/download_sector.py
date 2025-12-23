#!/usr/bin/env python3
"""
Script para descargar la página HTML de un sector específico de TradingView.

Lee un JSON con sectores y descarga el HTML del primer sector (o uno especificado).
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


def cargar_json_sectores(archivo_json: Path) -> dict:
    """
    Carga el JSON con los sectores.
    
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
        description='Descarga el HTML de un sector específico desde el JSON de sectores',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python download_sector.py sectores.json
  python download_sector.py sectores.json --indice 0
  python download_sector.py sectores.json --output sector.html
  python download_sector.py sectores.json --indice 2 --output-dir html_sectores
        """
    )
    
    parser.add_argument(
        'json_sectores',
        type=str,
        help='Archivo JSON con los sectores (generado por download_page.py)'
    )
    
    parser.add_argument(
        '--indice', '-i',
        type=int,
        default=0,
        help='Índice del sector a descargar (default: 0, primer sector)'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida (default: genera nombre automático basado en el sector)'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='html',
        help='Directorio donde guardar los archivos HTML (default: html)'
    )
    
    parser.add_argument(
        '--industries', '-ind',
        action='store_true',
        help='Descargar la página de industrias en lugar del sector (agrega /industries a la URL)'
    )
    
    args = parser.parse_args()
    
    # Cargar JSON con sectores
    archivo_json = Path(args.json_sectores)
    datos = cargar_json_sectores(archivo_json)
    
    # Verificar que tenga sectores
    if 'sectores' not in datos or not datos['sectores']:
        print("Error: El JSON no contiene sectores", file=sys.stderr)
        sys.exit(1)
    
    sectores = datos['sectores']
    
    # Verificar que el índice sea válido
    if args.indice < 0 or args.indice >= len(sectores):
        print(f"Error: Índice {args.indice} fuera de rango. Hay {len(sectores)} sectores (0-{len(sectores)-1})", file=sys.stderr)
        sys.exit(1)
    
    # Obtener el sector seleccionado
    sector = sectores[args.indice]
    url_sector = sector.get('url_sector', '')
    nombre_sector = sector.get('nombre', 'sector')
    
    if not url_sector:
        print(f"Error: El sector '{nombre_sector}' no tiene URL", file=sys.stderr)
        sys.exit(1)
    
    # Si se solicita la página de industrias, agregar /industries a la URL
    if args.industries:
        # Asegurarse de que la URL termine con / antes de agregar industries
        url_descargar = url_sector.rstrip('/') + '/industries/'
        tipo_pagina = 'industrias'
    else:
        url_descargar = url_sector
        tipo_pagina = 'sector'
    
    print(f"Sector seleccionado: {nombre_sector}", file=sys.stderr)
    print(f"Tipo de página: {tipo_pagina}", file=sys.stderr)
    print(f"URL: {url_descargar}", file=sys.stderr)
    
    # Generar nombre de archivo si no se especifica
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Crear nombre basado en el sector y timestamp
        output_dir = Path(args.output_dir)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Limpiar nombre del sector para usar como nombre de archivo
        nombre_archivo = nombre_sector.lower().replace(' ', '_').replace(',', '').replace('.', '')
        nombre_archivo = ''.join(c for c in nombre_archivo if c.isalnum() or c == '_')
        
        prefijo = 'industrias' if args.industries else 'sector'
        archivo_salida = output_dir / f"{prefijo}_{nombre_archivo}_{timestamp}.html"
    
    # Descargar la página
    html = descargar_pagina(url_descargar)
    
    # Guardar el HTML
    guardar_html(html, archivo_salida)
    
    print(f"\nResumen:", file=sys.stderr)
    print(f"  - Sector: {nombre_sector}", file=sys.stderr)
    print(f"  - Tipo: {tipo_pagina}", file=sys.stderr)
    print(f"  - URL: {url_descargar}", file=sys.stderr)
    print(f"  - Archivo guardado: {archivo_salida}", file=sys.stderr)


if __name__ == '__main__':
    main()


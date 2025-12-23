#!/usr/bin/env python3
"""
Script para descargar páginas de TradingView y extraer datos del tbody en JSON.

Descarga la página, busca el tbody de la tabla y extrae toda la información
disponible, guardándola en formato JSON.
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from urllib.parse import urljoin

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


def limpiar_texto(texto: str) -> str:
    """
    Limpia y normaliza el texto extraído.
    
    Args:
        texto: Texto a limpiar
    
    Returns:
        Texto limpio
    """
    if not texto:
        return ''
    # Eliminar espacios extra y saltos de línea
    texto = ' '.join(texto.split())
    return texto.strip()


def construir_url_completa(href: str, url_base: str) -> str:
    """
    Construye una URL completa a partir de un href relativo.
    
    Args:
        href: URL relativa
        url_base: URL base
    
    Returns:
        URL completa
    """
    if not href:
        return ''
    
    if href.startswith('http://') or href.startswith('https://'):
        return href
    
    return urljoin(url_base, href)


def extraer_sectores(html: str, url_base: str) -> List[Dict]:
    """
    Extrae los sectores del tbody y los formatea en el formato solicitado.
    
    Args:
        html: Contenido HTML
        url_base: URL base para construir URLs completas
    
    Returns:
        Lista de sectores con nombre, capitalización y URL
    """
    soup = BeautifulSoup(html, 'html.parser')
    sectores = []
    
    # Buscar la tabla
    tabla = soup.find('table')
    if not tabla:
        print("No se encontró ninguna tabla en el HTML", file=sys.stderr)
        return sectores
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        print("No se encontró tbody en la tabla", file=sys.stderr)
        return sectores
    
    # Extraer todas las filas
    filas = tbody.find_all('tr')
    
    for fila in filas:
        celdas = fila.find_all('td')
        
        if len(celdas) < 2:
            continue
        
        # Primera celda: nombre y URL del sector
        primera_celda = celdas[0]
        enlace = primera_celda.find('a')
        
        nombre = ''
        url_sector = ''
        
        if enlace:
            nombre = limpiar_texto(enlace.get_text())
            href = enlace.get('href', '')
            url_sector = construir_url_completa(href, url_base)
        else:
            nombre = limpiar_texto(primera_celda.get_text())
        
        # Segunda celda: capitalización de mercado
        segunda_celda = celdas[1]
        capitalizacion = limpiar_texto(segunda_celda.get_text())
        
        # Agregar el sector solo si tiene nombre
        if nombre:
            sectores.append({
                'nombre': nombre,
                'capitalizacion_mercado': capitalizacion,
                'url_sector': url_sector,
                'industrias': []  # Inicializar array de industrias
            })
    
    return sectores


def extraer_industrias(html: str, url_base: str) -> List[Dict]:
    """
    Extrae las industrias del tbody de una página de industrias.
    
    Args:
        html: Contenido HTML de la página de industrias
        url_base: URL base para construir URLs completas
    
    Returns:
        Lista de industrias con nombre, capitalización y URL
    """
    soup = BeautifulSoup(html, 'html.parser')
    industrias = []
    
    # Buscar la tabla
    tabla = soup.find('table')
    if not tabla:
        print("No se encontró ninguna tabla en el HTML", file=sys.stderr)
        return industrias
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        print("No se encontró tbody en la tabla", file=sys.stderr)
        return industrias
    
    # Extraer todas las filas
    filas = tbody.find_all('tr')
    
    for fila in filas:
        celdas = fila.find_all('td')
        
        if len(celdas) < 2:
            continue
        
        # Primera celda: nombre y URL de la industria
        primera_celda = celdas[0]
        enlace = primera_celda.find('a')
        
        nombre = ''
        url_industria = ''
        
        if enlace:
            nombre = limpiar_texto(enlace.get_text())
            href = enlace.get('href', '')
            url_industria = construir_url_completa(href, url_base)
        else:
            nombre = limpiar_texto(primera_celda.get_text())
        
        # Segunda celda: capitalización de mercado
        segunda_celda = celdas[1]
        capitalizacion = limpiar_texto(segunda_celda.get_text())
        
        # Agregar la industria solo si tiene nombre
        if nombre:
            industrias.append({
                'nombre': nombre,
                'capitalizacion_mercado': capitalizacion,
                'url_industria': url_industria
            })
    
    return industrias


def guardar_json(datos: Dict, archivo_salida: Path):
    """
    Guarda los datos en formato JSON.
    
    Args:
        datos: Diccionario con los datos a guardar
        archivo_salida: Ruta del archivo de salida
    """
    try:
        archivo_salida.parent.mkdir(parents=True, exist_ok=True)
        
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)
        
        tamaño = archivo_salida.stat().st_size
        print(f"JSON guardado en: {archivo_salida}", file=sys.stderr)
        print(f"Tamaño: {tamaño:,} bytes ({tamaño/1024:.2f} KB)", file=sys.stderr)
    
    except Exception as e:
        print(f"Error al guardar el archivo: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Descarga páginas de TradingView y las guarda como HTML',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python download_page.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/
  python download_page.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/ --output sector.html
        """
    )
    
    parser.add_argument(
        'url',
        type=str,
        help='URL a descargar'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida (default: genera nombre automático basado en la URL)'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='html',
        help='Directorio donde guardar los archivos HTML (default: html)'
    )
    
    args = parser.parse_args()
    
    # Generar nombre de archivo si no se especifica
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Crear nombre basado en la URL y timestamp
        output_dir = Path(args.output_dir)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Extraer nombre descriptivo de la URL
        url_parts = args.url.rstrip('/').split('/')
        nombre = url_parts[-1] if url_parts[-1] else 'page'
        nombre = nombre.replace('-', '_')
        
        archivo_salida = output_dir / f"{nombre}_{timestamp}.json"
    
    # Descargar la página
    html = descargar_pagina(args.url)
    
    # Extraer sectores del tbody
    sectores = extraer_sectores(html, args.url)
    
    # Construir resultado final en el formato solicitado
    resultado_final = {
        'url': args.url,
        'fecha_descarga': datetime.now().isoformat(),
        'sectores': sectores
    }
    
    # Guardar como JSON
    guardar_json(resultado_final, archivo_salida)
    
    # Imprimir resumen
    print(f"\nResumen:", file=sys.stderr)
    print(f"  - Sectores extraídos: {len(sectores)}", file=sys.stderr)


if __name__ == '__main__':
    main()


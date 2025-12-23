#!/usr/bin/env python3
"""
Script para enriquecer el JSON de sectores con las industrias de cada sector.

Lee el JSON de sectores, descarga la página de industrias de cada sector,
extrae las industrias y las agrega al JSON.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict

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
        return None


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
    
    from urllib.parse import urljoin
    return urljoin(url_base, href)


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
        print("  No se encontró ninguna tabla en el HTML", file=sys.stderr)
        return industrias
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        print("  No se encontró tbody en la tabla", file=sys.stderr)
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


def cargar_json(archivo_json: Path) -> dict:
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
        print(f"\nJSON guardado en: {archivo_salida}", file=sys.stderr)
        print(f"Tamaño: {tamaño:,} bytes ({tamaño/1024:.2f} KB)", file=sys.stderr)
    
    except Exception as e:
        print(f"Error al guardar el archivo: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Enriquece el JSON de sectores con las industrias de cada sector',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python enriquecer_sectores.py sectores.json
  python enriquecer_sectores.py sectores.json --output sectores_enriquecidos.json
  python enriquecer_sectores.py sectores.json --delay 2 --max-errores 5
        """
    )
    
    parser.add_argument(
        'json_sectores',
        type=str,
        help='Archivo JSON con los sectores (generado por download_page.py)'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida (default: agrega _enriquecido al nombre original)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay en segundos entre descargas (default: 1.0)'
    )
    
    parser.add_argument(
        '--max-errores',
        type=int,
        default=10,
        help='Máximo número de errores consecutivos antes de detenerse (default: 10)'
    )
    
    parser.add_argument(
        '--indice-inicio',
        type=int,
        default=0,
        help='Índice del primer sector a procesar (default: 0)'
    )
    
    parser.add_argument(
        '--indice-fin',
        type=int,
        default=None,
        help='Índice del último sector a procesar (default: todos)'
    )
    
    args = parser.parse_args()
    
    # Cargar JSON con sectores
    archivo_json = Path(args.json_sectores)
    datos = cargar_json(archivo_json)
    
    # Verificar que tenga sectores
    if 'sectores' not in datos or not datos['sectores']:
        print("Error: El JSON no contiene sectores", file=sys.stderr)
        sys.exit(1)
    
    sectores = datos['sectores']
    
    # Determinar rango de sectores a procesar
    indice_inicio = args.indice_inicio
    indice_fin = args.indice_fin if args.indice_fin is not None else len(sectores)
    
    if indice_inicio < 0 or indice_fin > len(sectores):
        print(f"Error: Rango inválido. Hay {len(sectores)} sectores (0-{len(sectores)-1})", file=sys.stderr)
        sys.exit(1)
    
    print(f"Procesando sectores {indice_inicio} a {indice_fin-1} de {len(sectores)}", file=sys.stderr)
    
    # Procesar cada sector
    errores_consecutivos = 0
    sectores_procesados = 0
    
    for i in range(indice_inicio, indice_fin):
        sector = sectores[i]
        nombre_sector = sector.get('nombre', f'Sector {i}')
        url_sector = sector.get('url_sector', '')
        
        if not url_sector:
            print(f"[{i+1}/{len(sectores)}] Saltando {nombre_sector}: sin URL", file=sys.stderr)
            continue
        
        # Construir URL de industrias
        url_industrias = url_sector.rstrip('/') + '/industries/'
        
        print(f"\n[{i+1}/{len(sectores)}] Procesando: {nombre_sector}", file=sys.stderr)
        print(f"  URL: {url_industrias}", file=sys.stderr)
        
        # Descargar página de industrias
        html = descargar_pagina(url_industrias)
        
        if html is None:
            errores_consecutivos += 1
            print(f"  Error al descargar (errores consecutivos: {errores_consecutivos})", file=sys.stderr)
            
            if errores_consecutivos >= args.max_errores:
                print(f"\nSe alcanzó el máximo de errores consecutivos ({args.max_errores})", file=sys.stderr)
                break
            
            # Esperar antes de continuar
            time.sleep(args.delay * 2)  # Delay más largo después de un error
            continue
        
        # Extraer industrias
        industrias = extraer_industrias(html, url_industrias)
        
        # Agregar industrias al sector
        if 'industrias' not in sector:
            sector['industrias'] = []
        
        sector['industrias'] = industrias
        
        print(f"  Industrias encontradas: {len(industrias)}", file=sys.stderr)
        
        sectores_procesados += 1
        errores_consecutivos = 0  # Resetear contador de errores
        
        # Esperar antes de la siguiente descarga
        if i < indice_fin - 1:  # No esperar después del último
            time.sleep(args.delay)
    
    # Generar nombre de archivo de salida
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Agregar _enriquecido al nombre original
        nombre_original = archivo_json.stem
        archivo_salida = archivo_json.parent / f"{nombre_original}_enriquecido.json"
    
    # Actualizar fecha de descarga
    datos['fecha_actualizacion'] = datetime.now().isoformat()
    
    # Guardar JSON enriquecido
    guardar_json(datos, archivo_salida)
    
    print(f"\nResumen:", file=sys.stderr)
    print(f"  - Sectores procesados: {sectores_procesados}", file=sys.stderr)
    print(f"  - Errores consecutivos: {errores_consecutivos}", file=sys.stderr)
    print(f"  - Archivo guardado: {archivo_salida}", file=sys.stderr)


if __name__ == '__main__':
    main()


#!/usr/bin/env python3
"""
Script para extraer las acciones de una industria y agregarlas al JSON.

Lee el JSON enriquecido con sectores e industrias, descarga las páginas de industrias,
extrae las primeras 10 acciones de cada industria y las agrega al JSON.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup


def descargar_pagina(url: str, user_agent: str = None) -> Optional[str]:
    """
    Descarga el contenido HTML de una URL.
    
    Args:
        url: URL a descargar
        user_agent: User-Agent personalizado (opcional)
    
    Returns:
        Contenido HTML como string o None si hay error
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
        print(f"  Descargando: {url}", file=sys.stderr)
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Intentar decodificar con el encoding correcto
        response.encoding = response.apparent_encoding or 'utf-8'
        
        return response.text
    
    except requests.exceptions.RequestException as e:
        print(f"  Error al descargar la página: {e}", file=sys.stderr)
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


def extraer_acciones(html: str, url_base: str, limite: int = 10) -> List[Dict]:
    """
    Extrae las acciones del tbody de una página de industria.
    
    Args:
        html: Contenido HTML de la página de industria
        url_base: URL base para construir URLs completas
        limite: Número máximo de acciones a extraer (default: 10)
    
    Returns:
        Lista de acciones con nombre, ticker, image_url, url_accion, capitalizacion_mercado
    """
    soup = BeautifulSoup(html, 'html.parser')
    acciones = []
    
    # Buscar la tabla
    tabla = soup.find('table')
    if not tabla:
        print("    No se encontró ninguna tabla en el HTML", file=sys.stderr)
        return acciones
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        print("    No se encontró tbody en la tabla", file=sys.stderr)
        return acciones
    
    # Extraer todas las filas
    filas = tbody.find_all('tr', limit=limite)
    
    for fila in filas:
        celdas = fila.find_all('td')
        
        if len(celdas) < 2:
            continue
        
        # Primera celda: ticker, nombre, imagen y URL
        primera_celda = celdas[0]
        
        # Buscar enlace con el ticker/nombre
        enlace = primera_celda.find('a')
        
        nombre = ''
        ticker = ''
        url_accion = ''
        
        if enlace:
            # El texto del enlace puede contener el ticker y nombre
            texto_enlace = limpiar_texto(enlace.get_text())
            href = enlace.get('href', '')
            url_accion = construir_url_completa(href, url_base)
            
            # Intentar extraer ticker y nombre del texto
            # Formato típico: "AAPL" o "AAPL Apple Inc."
            partes = texto_enlace.split(None, 1)
            if len(partes) >= 1:
                ticker = partes[0]
                nombre = partes[1] if len(partes) > 1 else texto_enlace
            else:
                ticker = texto_enlace
                nombre = texto_enlace
        
        # Buscar imagen (logo)
        imagen = primera_celda.find('img')
        image_url = ''
        if imagen:
            image_url = imagen.get('src', '') or imagen.get('data-src', '')
            if image_url and not image_url.startswith('http'):
                image_url = construir_url_completa(image_url, url_base)
        
        # Buscar capitalización de mercado (generalmente en la segunda o tercera celda)
        capitalizacion = ''
        if len(celdas) >= 2:
            # Intentar encontrar la celda con capitalización
            # Puede estar en diferentes posiciones según la tabla
            for i, celda in enumerate(celdas[1:], start=1):
                texto_celda = limpiar_texto(celda.get_text())
                # Buscar patrones de capitalización (T, B, M, USD)
                if 'USD' in texto_celda or 'T' in texto_celda or 'B' in texto_celda or 'M' in texto_celda:
                    capitalizacion = texto_celda
                    break
        
        # Si no encontramos capitalización, usar la segunda celda
        if not capitalizacion and len(celdas) >= 2:
            capitalizacion = limpiar_texto(celdas[1].get_text())
        
        # Agregar la acción solo si tiene ticker
        if ticker:
            acciones.append({
                'nombre': nombre,
                'ticker': ticker,
                'image_url': image_url,
                'url_accion': url_accion,
                'capitalizacion_mercado': capitalizacion
            })
    
    return acciones


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
        description='Extrae las acciones de las industrias y las agrega al JSON',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python extraer_acciones.py sectores_enriquecidos.json
  python extraer_acciones.py sectores_enriquecidos.json --output sectores_completo.json
  python extraer_acciones.py sectores_enriquecidos.json --delay 2 --max-acciones 10
  python extraer_acciones.py sectores_enriquecidos.json --sector 0 --industria 0
        """
    )
    
    parser.add_argument(
        'json_sectores',
        type=str,
        help='Archivo JSON con los sectores e industrias (generado por enriquecer_sectores.py)'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida (default: agrega _con_acciones al nombre original)'
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
        '--max-acciones',
        type=int,
        default=10,
        help='Número máximo de acciones a extraer por industria (default: 10)'
    )
    
    parser.add_argument(
        '--sector',
        type=int,
        default=None,
        help='Procesar solo un sector específico (índice)'
    )
    
    parser.add_argument(
        '--industria',
        type=int,
        default=None,
        help='Procesar solo una industria específica (índice, requiere --sector)'
    )
    
    args = parser.parse_args()
    
    # Cargar JSON con sectores e industrias
    archivo_json = Path(args.json_sectores)
    datos = cargar_json(archivo_json)
    
    # Verificar que tenga sectores
    if 'sectores' not in datos or not datos['sectores']:
        print("Error: El JSON no contiene sectores", file=sys.stderr)
        sys.exit(1)
    
    sectores = datos['sectores']
    
    # Determinar qué procesar
    if args.sector is not None:
        if args.sector < 0 or args.sector >= len(sectores):
            print(f"Error: Índice de sector {args.sector} fuera de rango. Hay {len(sectores)} sectores (0-{len(sectores)-1})", file=sys.stderr)
            sys.exit(1)
        sectores_a_procesar = [sectores[args.sector]]
    else:
        sectores_a_procesar = sectores
    
    print(f"Procesando {len(sectores_a_procesar)} sector(es)", file=sys.stderr)
    
    # Procesar cada sector
    errores_consecutivos = 0
    industrias_procesadas = 0
    total_acciones = 0
    
    for sector_idx, sector in enumerate(sectores_a_procesar):
        nombre_sector = sector.get('nombre', f'Sector {sector_idx}')
        
        if 'industrias' not in sector or not sector['industrias']:
            print(f"\n[{sector_idx+1}/{len(sectores)}] Saltando {nombre_sector}: sin industrias", file=sys.stderr)
            continue
        
        industrias = sector['industrias']
        
        # Si se especificó una industria específica
        if args.industria is not None:
            if args.industria < 0 or args.industria >= len(industrias):
                print(f"Error: Índice de industria {args.industria} fuera de rango. Hay {len(industrias)} industrias (0-{len(industrias)-1})", file=sys.stderr)
                sys.exit(1)
            industrias = [industrias[args.industria]]
        
        print(f"\n[{sector_idx+1}/{len(sectores)}] Sector: {nombre_sector} ({len(industrias)} industrias)", file=sys.stderr)
        
        for ind_idx, industria in enumerate(industrias):
            nombre_industria = industria.get('nombre', f'Industria {ind_idx}')
            url_industria = industria.get('url_industria', '')
            
            if not url_industria:
                print(f"  [{ind_idx+1}/{len(industrias)}] Saltando {nombre_industria}: sin URL", file=sys.stderr)
                continue
            
            print(f"  [{ind_idx+1}/{len(industrias)}] Procesando: {nombre_industria}", file=sys.stderr)
            
            # Descargar página de la industria
            html = descargar_pagina(url_industria)
            
            if html is None:
                errores_consecutivos += 1
                print(f"    Error al descargar (errores consecutivos: {errores_consecutivos})", file=sys.stderr)
                
                if errores_consecutivos >= args.max_errores:
                    print(f"\nSe alcanzó el máximo de errores consecutivos ({args.max_errores})", file=sys.stderr)
                    break
                
                # Esperar antes de continuar
                time.sleep(args.delay * 2)
                continue
            
            # Extraer acciones
            acciones = extraer_acciones(html, url_industria, args.max_acciones)
            
            # Agregar acciones a la industria
            if 'acciones' not in industria:
                industria['acciones'] = []
            
            industria['acciones'] = acciones
            
            print(f"    Acciones encontradas: {len(acciones)}", file=sys.stderr)
            
            industrias_procesadas += 1
            total_acciones += len(acciones)
            errores_consecutivos = 0  # Resetear contador de errores
            
            # Esperar antes de la siguiente descarga
            time.sleep(args.delay)
        
        if errores_consecutivos >= args.max_errores:
            break
    
    # Generar nombre de archivo de salida
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Agregar _con_acciones al nombre original
        nombre_original = archivo_json.stem
        archivo_salida = archivo_json.parent / f"{nombre_original}_con_acciones.json"
    
    # Actualizar fecha de actualización
    datos['fecha_actualizacion'] = datetime.now().isoformat()
    
    # Guardar JSON con acciones
    guardar_json(datos, archivo_salida)
    
    print(f"\nResumen:", file=sys.stderr)
    print(f"  - Industrias procesadas: {industrias_procesadas}", file=sys.stderr)
    print(f"  - Total de acciones extraídas: {total_acciones}", file=sys.stderr)
    print(f"  - Errores consecutivos: {errores_consecutivos}", file=sys.stderr)
    print(f"  - Archivo guardado: {archivo_salida}", file=sys.stderr)


if __name__ == '__main__':
    main()


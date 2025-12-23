#!/usr/bin/env python3
"""
Script completo para extraer sectores, industrias y acciones de TradingView.

Descarga y extrae:
1. Sectores desde la URL principal
2. Industrias de cada sector
3. Acciones (top 10) de cada industria

Incluye timeouts configurables para evitar bloqueos por IP.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


def descargar_pagina(url: str, user_agent: str = None, timeout: int = 30) -> Optional[str]:
    """
    Descarga el contenido HTML de una URL con manejo de errores.
    
    Args:
        url: URL a descargar
        user_agent: User-Agent personalizado (opcional)
        timeout: Timeout en segundos (default: 30)
    
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
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        # Intentar decodificar con el encoding correcto
        response.encoding = response.apparent_encoding or 'utf-8'
        
        return response.text
    
    except requests.exceptions.Timeout:
        print(f"  ⚠ Timeout al descargar: {url}", file=sys.stderr)
        return None
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Error al descargar {url}: {e}", file=sys.stderr)
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
    
    return urljoin(url_base, href)


def extraer_sectores(html: str, url_base: str) -> List[Dict]:
    """
    Extrae los sectores del tbody.
    
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
        print("  ⚠ No se encontró ninguna tabla en el HTML", file=sys.stderr)
        return sectores
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        print("  ⚠ No se encontró tbody en la tabla", file=sys.stderr)
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
                'industrias': []
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
        return industrias
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
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
                'url_industria': url_industria,
                'acciones': []
            })
    
    return industrias


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
        return acciones
    
    # Buscar el tbody
    tbody = tabla.find('tbody')
    if not tbody:
        return acciones
    
    # Extraer todas las filas (limitadas)
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
        print(f"\n✅ JSON guardado en: {archivo_salida}", file=sys.stderr)
        print(f"   Tamaño: {tamaño:,} bytes ({tamaño/1024:.2f} KB)", file=sys.stderr)
    
    except Exception as e:
        print(f"❌ Error al guardar el archivo: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description='Script completo para extraer sectores, industrias y acciones de TradingView',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scraper_completo.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/
  python scraper_completo.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/ --output datos_completos.json
  python scraper_completo.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/ --delay 2 --timeout 60
  python scraper_completo.py https://es.tradingview.com/markets/stocks-usa/sectorandindustry-sector/ --max-acciones 5 --max-errores 5
        """
    )
    
    parser.add_argument(
        'url',
        type=str,
        help='URL principal de sectores de TradingView'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Archivo de salida JSON (default: genera nombre automático)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=1.5,
        help='Delay en segundos entre descargas (default: 1.5)'
    )
    
    parser.add_argument(
        '--timeout',
        type=int,
        default=30,
        help='Timeout en segundos para cada petición HTTP (default: 30)'
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
        '--max-sectores',
        type=int,
        default=None,
        help='Procesar solo los primeros N sectores (útil para pruebas)'
    )
    
    args = parser.parse_args()
    
    inicio_total = time.time()
    
    print("=" * 70, file=sys.stderr)
    print("🚀 Iniciando scraper completo de TradingView", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    print(f"URL: {args.url}", file=sys.stderr)
    print(f"Delay: {args.delay}s | Timeout: {args.timeout}s | Max acciones: {args.max_acciones}", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    
    # PASO 1: Descargar y extraer sectores
    print("\n📊 PASO 1: Extrayendo sectores...", file=sys.stderr)
    html_sectores = descargar_pagina(args.url, timeout=args.timeout)
    
    if html_sectores is None:
        print("❌ Error: No se pudo descargar la página de sectores", file=sys.stderr)
        sys.exit(1)
    
    sectores = extraer_sectores(html_sectores, args.url)
    print(f"✅ Sectores encontrados: {len(sectores)}", file=sys.stderr)
    
    if not sectores:
        print("❌ Error: No se encontraron sectores", file=sys.stderr)
        sys.exit(1)
    
    # Limitar sectores si se especificó
    if args.max_sectores:
        sectores = sectores[:args.max_sectores]
        print(f"⚠ Limitando a {args.max_sectores} sectores para pruebas", file=sys.stderr)
    
    time.sleep(args.delay)
    
    # PASO 2: Extraer industrias de cada sector
    print(f"\n🏭 PASO 2: Extrayendo industrias de {len(sectores)} sectores...", file=sys.stderr)
    errores_consecutivos = 0
    total_industrias = 0
    
    for sector_idx, sector in enumerate(sectores):
        nombre_sector = sector.get('nombre', f'Sector {sector_idx}')
        url_sector = sector.get('url_sector', '')
        
        if not url_sector:
            print(f"  [{sector_idx+1}/{len(sectores)}] ⚠ Saltando {nombre_sector}: sin URL", file=sys.stderr)
            continue
        
        # Construir URL de industrias
        url_industrias = url_sector.rstrip('/') + '/industries/'
        
        print(f"  [{sector_idx+1}/{len(sectores)}] 📂 {nombre_sector}", file=sys.stderr)
        
        # Descargar página de industrias
        html_industrias = descargar_pagina(url_industrias, timeout=args.timeout)
        
        if html_industrias is None:
            errores_consecutivos += 1
            print(f"    ⚠ Error al descargar (errores consecutivos: {errores_consecutivos})", file=sys.stderr)
            
            if errores_consecutivos >= args.max_errores:
                print(f"\n❌ Se alcanzó el máximo de errores consecutivos ({args.max_errores})", file=sys.stderr)
                break
            
            time.sleep(args.delay * 2)  # Delay más largo después de un error
            continue
        
        # Extraer industrias
        industrias = extraer_industrias(html_industrias, url_industrias)
        sector['industrias'] = industrias
        
        print(f"    ✅ Industrias encontradas: {len(industrias)}", file=sys.stderr)
        
        total_industrias += len(industrias)
        errores_consecutivos = 0  # Resetear contador de errores
        
        time.sleep(args.delay)
    
    print(f"\n✅ Total de industrias extraídas: {total_industrias}", file=sys.stderr)
    
    # PASO 3: Extraer acciones de cada industria
    print(f"\n📈 PASO 3: Extrayendo acciones (top {args.max_acciones}) de cada industria...", file=sys.stderr)
    errores_consecutivos = 0
    total_acciones = 0
    industrias_procesadas = 0
    
    for sector_idx, sector in enumerate(sectores):
        nombre_sector = sector.get('nombre', f'Sector {sector_idx}')
        industrias = sector.get('industrias', [])
        
        if not industrias:
            continue
        
        print(f"  [{sector_idx+1}/{len(sectores)}] 📂 {nombre_sector} ({len(industrias)} industrias)", file=sys.stderr)
        
        for ind_idx, industria in enumerate(industrias):
            nombre_industria = industria.get('nombre', f'Industria {ind_idx}')
            url_industria = industria.get('url_industria', '')
            
            if not url_industria:
                continue
            
            print(f"    [{ind_idx+1}/{len(industrias)}] 🏭 {nombre_industria}", file=sys.stderr)
            
            # Descargar página de la industria
            html_industria = descargar_pagina(url_industria, timeout=args.timeout)
            
            if html_industria is None:
                errores_consecutivos += 1
                print(f"      ⚠ Error al descargar (errores consecutivos: {errores_consecutivos})", file=sys.stderr)
                
                if errores_consecutivos >= args.max_errores:
                    print(f"\n❌ Se alcanzó el máximo de errores consecutivos ({args.max_errores})", file=sys.stderr)
                    break
                
                time.sleep(args.delay * 2)
                continue
            
            # Extraer acciones
            acciones = extraer_acciones(html_industria, url_industria, args.max_acciones)
            industria['acciones'] = acciones
            
            print(f"      ✅ Acciones encontradas: {len(acciones)}", file=sys.stderr)
            
            industrias_procesadas += 1
            total_acciones += len(acciones)
            errores_consecutivos = 0
            
            time.sleep(args.delay)
        
        if errores_consecutivos >= args.max_errores:
            break
    
    print(f"\n✅ Total de acciones extraídas: {total_acciones}", file=sys.stderr)
    
    # Construir resultado final
    resultado_final = {
        'url': args.url,
        'fecha_descarga': datetime.now().isoformat(),
        'sectores': sectores,
        'estadisticas': {
            'total_sectores': len(sectores),
            'total_industrias': total_industrias,
            'total_acciones': total_acciones,
            'industrias_procesadas': industrias_procesadas
        }
    }
    
    # Generar nombre de archivo de salida
    if args.output:
        archivo_salida = Path(args.output)
    else:
        # Crear nombre basado en timestamp
        output_dir = Path('html')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archivo_salida = output_dir / f"datos_completos_{timestamp}.json"
    
    # Guardar JSON
    guardar_json(resultado_final, archivo_salida)
    
    # Resumen final
    tiempo_total = time.time() - inicio_total
    print("\n" + "=" * 70, file=sys.stderr)
    print("📊 RESUMEN FINAL", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    print(f"✅ Sectores: {len(sectores)}", file=sys.stderr)
    print(f"✅ Industrias: {total_industrias}", file=sys.stderr)
    print(f"✅ Acciones: {total_acciones}", file=sys.stderr)
    print(f"⏱ Tiempo total: {tiempo_total:.1f} segundos", file=sys.stderr)
    print(f"💾 Archivo: {archivo_salida}", file=sys.stderr)
    print("=" * 70, file=sys.stderr)


if __name__ == '__main__':
    main()


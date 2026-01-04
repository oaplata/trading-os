#!/usr/bin/env python3
"""
Script para enriquecer datos de acciones de Quantfury.

Este script toma el archivo stocks.json y agrega información adicional:
- MarketCap (en número para ordenar)
- Bolsa en la que operan
- País de la acción
- País de la bolsa
- Información adicional (sector, industria, moneda, etc.)
"""

import json
import time
import logging
import threading
import sys
import os
import warnings
import io
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from contextlib import contextmanager

# Suprimir logging de urllib3 ANTES de importar yfinance
logging.getLogger('urllib3').setLevel(logging.CRITICAL)
logging.getLogger('urllib3.connectionpool').setLevel(logging.CRITICAL)
logging.getLogger('requests').setLevel(logging.CRITICAL)

import yfinance as yf
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# Suprimir también después de importar
logging.getLogger('yfinance').setLevel(logging.CRITICAL)
logging.getLogger('yfinance.base').setLevel(logging.CRITICAL)

# Configurar logging básico - solo mostrar nuestros mensajes importantes
logging.basicConfig(
    level=logging.WARNING,
    format='%(message)s',
    force=True,
    handlers=[logging.StreamHandler(sys.stdout)]  # Solo stdout, no stderr
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Permitir INFO para rate limiting

# Context manager para suprimir stderr completamente
@contextmanager
def suppress_stderr():
    """Suprime completamente stderr temporalmente."""
    with open(os.devnull, 'w') as devnull:
        old_stderr = sys.stderr
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stderr = old_stderr

# Mapeo de códigos de Yahoo Finance a nombres estándar de exchanges
YAHOO_EXCHANGE_MAP = {
    # Estados Unidos
    'NYQ': 'NYSE',  # New York Stock Exchange
    'NMS': 'NASDAQ',  # NASDAQ Stock Market
    'NGM': 'NASDAQ',  # NASDAQ Global Market
    'NCM': 'NASDAQ',  # NASDAQ Capital Market
    'ASE': 'NYSE',  # American Stock Exchange (ahora parte de NYSE)
    'AMEX': 'AMEX',  # American Stock Exchange
    'PCX': 'NYSE',  # Pacific Exchange (ahora parte de NYSE)
    'OTC': 'OTC',  # Over The Counter
    'OTCQB': 'OTC',  # OTCQB
    'OTCQX': 'OTC',  # OTCQX
    'PINK': 'OTC',  # Pink Sheets
    
    # Reino Unido
    'LON': 'LSE',  # London Stock Exchange
    'LSE': 'LSE',  # London Stock Exchange
    
    # Alemania
    'XETR': 'XETRA',  # XETRA
    'XETRA': 'XETRA',
    'FRA': 'FRA',  # Frankfurt
    'MUN': 'MUN',  # Munich
    'GER': 'XETRA',  # Germany (general)
    'DUS': 'DUS',  # Düsseldorf
    'HAM': 'HAM',  # Hamburg
    'STU': 'STU',  # Stuttgart
    'BER': 'BER',  # Berlin
    
    # Francia
    'EPA': 'EURONEXT',  # Euronext Paris
    'PAR': 'EURONEXT',  # Paris
    'XPAR': 'EURONEXT',  # Paris
    
    # Países Bajos
    'AMS': 'EURONEXT',  # Euronext Amsterdam
    'ASM': 'EURONEXT',  # Amsterdam
    'XAMS': 'EURONEXT',  # Amsterdam
    
    # Bélgica
    'BRU': 'EURONEXT',  # Euronext Brussels
    'XBRU': 'EURONEXT',  # Brussels
    
    # Portugal
    'LIS': 'EURONEXT',  # Euronext Lisbon
    'XLIS': 'EURONEXT',  # Lisbon
    
    # Italia
    'MIL': 'MILAN',  # Borsa Italiana
    'BIT': 'MILAN',  # Milan
    'XMIL': 'MILAN',  # Milan
    
    # España
    'MAD': 'BME',  # Bolsas y Mercados Españoles
    'BME': 'BME',  # Bolsas y Mercados Españoles
    'XMAD': 'BME',  # Madrid
    'XBAR': 'BME',  # Barcelona
    'XBIL': 'BME',  # Bilbao
    'XVAL': 'BME',  # Valencia
    
    # Suiza
    'SWX': 'SIX',  # Swiss Exchange
    'SIX': 'SIX',  # SIX Swiss Exchange
    'XSWX': 'SIX',  # Swiss Exchange
    
    # Austria
    'VIE': 'VIE',  # Vienna Stock Exchange
    'XVIE': 'VIE',  # Vienna
    
    # Noruega
    'OSL': 'OSLO',  # Oslo Stock Exchange
    'XOSL': 'OSLO',  # Oslo
    
    # Suecia
    'STO': 'STOCKHOLM',  # Stockholm Stock Exchange
    'XSTO': 'STOCKHOLM',  # Stockholm
    
    # Dinamarca
    'CPH': 'COPENHAGEN',  # Copenhagen Stock Exchange
    'XCOP': 'COPENHAGEN',  # Copenhagen
    
    # Finlandia
    'HEL': 'HELSINKI',  # Helsinki Stock Exchange
    'XHEL': 'HELSINKI',  # Helsinki
    
    # Japón
    'TSE': 'TSE',  # Tokyo Stock Exchange
    'TYO': 'TSE',  # Tokyo
    'XTKS': 'TSE',  # Tokyo
    
    # Hong Kong
    'HKG': 'HKEX',  # Hong Kong Stock Exchange
    'HKEX': 'HKEX',  # Hong Kong Exchanges
    
    # China
    'SHE': 'SZSE',  # Shenzhen Stock Exchange
    'SHA': 'SSE',  # Shanghai Stock Exchange
    'SSE': 'SSE',  # Shanghai Stock Exchange
    'SZSE': 'SZSE',  # Shenzhen Stock Exchange
    'XSHE': 'SZSE',  # Shenzhen
    'XSHG': 'SSE',  # Shanghai
    
    # India
    'BSE': 'BSE',  # Bombay Stock Exchange
    'NSE': 'NSE',  # National Stock Exchange
    'XBOM': 'BSE',  # Bombay
    'XNSE': 'NSE',  # National Stock Exchange
    
    # Australia
    'ASX': 'ASX',  # Australian Securities Exchange
    'XASX': 'ASX',  # ASX
    
    # Canadá
    'TSX': 'TSX',  # Toronto Stock Exchange
    'TSXV': 'TSXV',  # TSX Venture Exchange
    'TOR': 'TSX',  # Toronto
    'XTSX': 'TSX',  # Toronto
    'V': 'TSXV',  # TSX Venture
    
    # Brasil
    'BVMF': 'B3',  # B3 (Brasil, Bolsa, Balcão)
    'B3': 'B3',  # B3
    'SAO': 'B3',  # São Paulo
    
    # México
    'BMV': 'BMV',  # Bolsa Mexicana de Valores
    'XMEX': 'BMV',  # Mexico
    
    # Argentina
    'BCBA': 'BYMA',  # Bolsas y Mercados Argentinos
    'BYMA': 'BYMA',  # Buenos Aires
    'XBUE': 'BYMA',  # Buenos Aires
    
    # Chile
    'BCS': 'SANTIAGO',  # Bolsa de Comercio de Santiago
    'XSGO': 'SANTIAGO',  # Santiago
    
    # Colombia
    'BVC': 'BVC',  # Bolsa de Valores de Colombia
    'XBOG': 'BVC',  # Bogotá
    
    # Perú
    'BVL': 'BVL',  # Bolsa de Valores de Lima
    'XLIM': 'BVL',  # Lima
    
    # Otros
    'SES': 'SGX',  # Singapore Exchange
    'SGX': 'SGX',  # Singapore Exchange
    'XSES': 'SGX',  # Singapore
    
    'TAI': 'TWSE',  # Taiwan Stock Exchange
    'TWSE': 'TWSE',  # Taiwan Stock Exchange
    'XTAI': 'TWSE',  # Taiwan
    
    'KRX': 'KRX',  # Korea Exchange
    'XKRX': 'KRX',  # Korea
    
    'JSE': 'JSE',  # Johannesburg Stock Exchange
    'XJSE': 'JSE',  # Johannesburg
}

# Mapeo de exchanges a países
EXCHANGE_COUNTRY_MAP = {
    'NYSE': 'United States',
    'NASDAQ': 'United States',
    'AMEX': 'United States',
    'OTC': 'United States',
    'LSE': 'United Kingdom',
    'XETRA': 'Germany',
    'FRA': 'Germany',
    'MUN': 'Germany',
    'EURONEXT': 'European Union',
    'MILAN': 'Italy',
    'BME': 'Spain',
    'SIX': 'Switzerland',
    'VIE': 'Austria',
    'OSLO': 'Norway',
    'STOCKHOLM': 'Sweden',
    'COPENHAGEN': 'Denmark',
    'HELSINKI': 'Finland',
    'TSE': 'Japan',
    'HKEX': 'Hong Kong',
    'SSE': 'China',
    'SZSE': 'China',
    'BSE': 'India',
    'NSE': 'India',
    'ASX': 'Australia',
    'TSX': 'Canada',
    'TSXV': 'Canada',
    'B3': 'Brazil',
    'BMV': 'Mexico',
    'BYMA': 'Argentina',
    'SANTIAGO': 'Chile',
    'BVC': 'Colombia',
    'BVL': 'Peru',
    'SGX': 'Singapore',
    'TWSE': 'Taiwan',
    'KRX': 'South Korea',
    'JSE': 'South Africa',
}

# Mapeo de monedas a países (para inferir país cuando no hay exchange)
CURRENCY_COUNTRY_MAP = {
    'USD': 'United States',
    'GBP': 'United Kingdom',
    'EUR': 'European Union',
    'JPY': 'Japan',
    'CNY': 'China',
    'HKD': 'Hong Kong',
    'INR': 'India',
    'AUD': 'Australia',
    'CAD': 'Canada',
    'BRL': 'Brazil',
    'MXN': 'Mexico',
    'ARS': 'Argentina',
    'CLP': 'Chile',
    'COP': 'Colombia',
    'PEN': 'Peru',
    'CHF': 'Switzerland',
    'SEK': 'Sweden',
    'NOK': 'Norway',
    'DKK': 'Denmark',
    'PLN': 'Poland',
    'KRW': 'South Korea',
    'SGD': 'Singapore',
    'TWD': 'Taiwan',
    'THB': 'Thailand',
    'IDR': 'Indonesia',
    'MYR': 'Malaysia',
    'PHP': 'Philippines',
    'ZAR': 'South Africa',
    'TRY': 'Turkey',
    'RUB': 'Russia',
    'ILS': 'Israel',
    'NZD': 'New Zealand',
}


def normalize_exchange(exchange: Optional[str]) -> Optional[str]:
    """
    Normaliza el código de exchange de Yahoo Finance a nombre estándar.
    
    Args:
        exchange: Código de exchange de Yahoo Finance (ej: 'NYQ', 'NMS')
    
    Returns:
        Nombre estándar del exchange (ej: 'NYSE', 'NASDAQ')
    """
    if not exchange:
        return None
    
    exchange_upper = exchange.upper()
    
    # Buscar en el mapeo de Yahoo Finance
    if exchange_upper in YAHOO_EXCHANGE_MAP:
        return YAHOO_EXCHANGE_MAP[exchange_upper]
    
    # Si ya es un nombre estándar, devolverlo
    if exchange_upper in EXCHANGE_COUNTRY_MAP:
        return exchange_upper
    
    # Buscar coincidencias parciales
    for yahoo_code, standard_name in YAHOO_EXCHANGE_MAP.items():
        if yahoo_code in exchange_upper:
            return standard_name
    
    # Si no se encuentra, devolver el original
    return exchange_upper


def get_exchange_country(exchange: Optional[str]) -> Optional[str]:
    """Obtiene el país de la bolsa basado en el exchange."""
    if not exchange:
        return None
    
    # Normalizar primero el exchange
    normalized_exchange = normalize_exchange(exchange)
    if not normalized_exchange:
        return None
    
    # Buscar coincidencias exactas
    if normalized_exchange in EXCHANGE_COUNTRY_MAP:
        return EXCHANGE_COUNTRY_MAP[normalized_exchange]
    
    # Buscar coincidencias parciales
    for key, country in EXCHANGE_COUNTRY_MAP.items():
        if key in normalized_exchange:
            return country
    
    return None


def get_country_from_currency(currency: Optional[str]) -> Optional[str]:
    """Infiere el país basado en la moneda."""
    if not currency:
        return None
    
    currency_upper = currency.upper()
    return CURRENCY_COUNTRY_MAP.get(currency_upper)


def parse_market_cap(market_cap_str: Any) -> Optional[float]:
    """Convierte market cap de string a número."""
    if market_cap_str is None:
        return None
    
    if isinstance(market_cap_str, (int, float)):
        return float(market_cap_str)
    
    if isinstance(market_cap_str, str):
        # Remover espacios y caracteres especiales
        market_cap_str = market_cap_str.strip().replace(',', '').replace(' ', '')
        
        # Convertir a número
        try:
            return float(market_cap_str)
        except ValueError:
            # Intentar parsear formatos como "1.5T", "500B", "100M"
            market_cap_str = market_cap_str.upper()
            multipliers = {
                'T': 1e12,
                'B': 1e9,
                'M': 1e6,
                'K': 1e3,
            }
            
            for suffix, multiplier in multipliers.items():
                if market_cap_str.endswith(suffix):
                    number_str = market_cap_str[:-1]
                    try:
                        return float(number_str) * multiplier
                    except ValueError:
                        pass
    
    return None


def enrich_stock_data(stock: Dict[str, str], retry_count: int = 3) -> Dict[str, Any]:
    """
    Enriquece los datos de una acción con información adicional.
    
    Args:
        stock: Diccionario con ticker y name
        retry_count: Número de reintentos en caso de error
    
    Returns:
        Diccionario con datos enriquecidos
    """
    ticker = stock.get('ticker', '')
    name = stock.get('name', '')
    
    result = {
        'ticker': ticker,
        'name': name,
        'marketCap': None,
        'exchange': None,
        'country': None,
        'exchangeCountry': None,
        'currency': None,
        'sector': None,
        'industry': None,
        'market': None,
        'fullTimeEmployees': None,
        'website': None,
        'longBusinessSummary': None,
        'error': None,
    }
    
    if not ticker:
        result['error'] = 'Ticker vacío'
        return result
    
    # Intentar obtener datos de yfinance
    for attempt in range(retry_count):
        try:
            # Suprimir completamente los errores de yfinance
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                with suppress_stderr():
                    yf_ticker = yf.Ticker(ticker)
                    info = yf_ticker.info
            
            # Verificar si se obtuvieron datos válidos
            if not info or len(info) < 5:
                result['error'] = 'Ticker no encontrado en Yahoo Finance'
                return result
            
            # Extraer información
            result['marketCap'] = parse_market_cap(info.get('marketCap'))
            
            # Obtener y normalizar el exchange
            raw_exchange = info.get('exchange') or info.get('stockExchange')
            result['exchange'] = normalize_exchange(raw_exchange)
            
            result['currency'] = info.get('currency')
            result['sector'] = info.get('sector')
            result['industry'] = info.get('industry')
            result['market'] = info.get('market')
            result['fullTimeEmployees'] = info.get('fullTimeEmployees')
            result['website'] = info.get('website')
            result['longBusinessSummary'] = info.get('longBusinessSummary')
            
            # Obtener país de la acción
            result['country'] = info.get('country') or info.get('headquartersLocation')
            
            # Si no hay país, intentar inferirlo
            if not result['country']:
                result['country'] = get_country_from_currency(result['currency'])
            
            # Obtener país de la bolsa (usar el exchange normalizado)
            result['exchangeCountry'] = get_exchange_country(result['exchange'])
            
            # Si no hay país de la bolsa pero hay país de la acción, usar ese
            if not result['exchangeCountry'] and result['country']:
                result['exchangeCountry'] = result['country']
            
            # Limpiar el resumen de negocio si es muy largo
            if result['longBusinessSummary'] and len(result['longBusinessSummary']) > 500:
                result['longBusinessSummary'] = result['longBusinessSummary'][:500] + '...'
            
            return result
            
        except Exception as e:
            error_str = str(e)
            
            # Manejar error de "too many requests" (429) - SOLO ESTOS SE LOGUEAN
            if '429' in error_str or 'too many' in error_str.lower() or 'rate limit' in error_str.lower():
                # Loguear solo errores de rate limiting
                print(f"\n⚠️  Rate limit detectado para {ticker} (intento {attempt + 1}/{retry_count})")
                # Esperar más tiempo antes de reintentar
                wait_time = 60 * (attempt + 1)  # 60, 120, 180 segundos
                if attempt < retry_count - 1:
                    print(f"⏳ Esperando {wait_time} segundos antes de reintentar...")
                    time.sleep(wait_time)
                    continue
                else:
                    result['error'] = 'Rate limit excedido - demasiadas peticiones'
                    print(f"❌ Rate limit excedido para {ticker} después de {retry_count} intentos")
                    return result
            
            # Para errores 404 (ticker no encontrado), no loguear, solo marcar error
            if '404' in error_str or 'Not Found' in error_str:
                result['error'] = 'Ticker no encontrado en Yahoo Finance'
                return result
            
            # Para otros errores, hacer backoff exponencial más conservador (sin loguear)
            if attempt < retry_count - 1:
                wait_time = 2 * (attempt + 1)  # 2, 4, 6 segundos
                time.sleep(wait_time)
                continue
            else:
                result['error'] = 'Error al obtener datos'
                return result
    
    return result


def process_stocks_batch(stocks: List[Dict[str, str]], max_workers: int = 2, delay_between_requests: float = 0.5) -> List[Dict[str, Any]]:
    """
    Procesa un lote de acciones en paralelo con rate limiting mejorado.
    
    Args:
        stocks: Lista de diccionarios con ticker y name
        max_workers: Número máximo de workers paralelos (reducido para evitar rate limiting)
        delay_between_requests: Pausa en segundos entre cada petición (por worker)
    
    Returns:
        Lista de diccionarios con datos enriquecidos
    """
    enriched_stocks = []
    last_request_lock = threading.Lock()
    last_request_time = [0.0] * max_workers  # Trackear última petición por worker
    
    def enrich_with_delay(stock: Dict[str, str], worker_id: int) -> Dict[str, Any]:
        """Enriquece una acción con delay para evitar rate limiting."""
        with last_request_lock:
            # Calcular tiempo desde última petición de este worker
            current_time = time.time()
            time_since_last = current_time - last_request_time[worker_id]
            
            # Si no ha pasado suficiente tiempo, esperar
            if time_since_last < delay_between_requests:
                wait_time = delay_between_requests - time_since_last
                last_request_time[worker_id] = current_time + wait_time
            else:
                last_request_time[worker_id] = current_time
        
        # Esperar fuera del lock para no bloquear otros workers
        if time_since_last < delay_between_requests:
            time.sleep(delay_between_requests - time_since_last)
        
        # Procesar la acción
        return enrich_stock_data(stock)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Crear todas las tareas
        future_to_stock = {
            executor.submit(enrich_with_delay, stock, idx % max_workers): stock
            for idx, stock in enumerate(stocks)
        }
        
        # Procesar resultados conforme se completan (más eficiente y muestra progreso real)
        with tqdm(total=len(stocks), desc="Procesando acciones", ncols=100, mininterval=0.5, file=sys.stdout, dynamic_ncols=True, leave=True) as pbar:
            for future in as_completed(future_to_stock):
                stock = future_to_stock[future]
                try:
                    result = future.result(timeout=300)  # Timeout de 5 minutos por acción
                    enriched_stocks.append(result)
                except Exception as e:
                    enriched_stocks.append({
                        'ticker': stock.get('ticker'),
                        'name': stock.get('name'),
                        'error': 'Error inesperado al procesar'
                    })
                finally:
                    pbar.update(1)
    
    return enriched_stocks


def main():
    """Función principal del script."""
    # Rutas de archivos
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    input_file = project_root / 'quantfury' / 'stocks.json'
    output_file = project_root / 'quantfury' / 'stocks_enriched.json'
    stats_file = project_root / 'quantfury' / 'enrichment_stats.json'
    
    # Verificar que existe el archivo de entrada
    if not input_file.exists():
        print(f"❌ Archivo no encontrado: {input_file}")
        return
    
    # Cargar datos de entrada
    print(f"📂 Cargando datos de {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        stocks = json.load(f)
    
    print(f"📊 Total de acciones a procesar: {len(stocks)}")
    print("⚙️  Configuración: 2 workers paralelos, 0.5s de pausa entre peticiones")
    print("⏱️  Esto puede tardar varias horas. El script guardará el progreso al finalizar.")
    print("🔇 Solo se mostrarán errores de rate limiting (429). Los errores 404 se guardan silenciosamente.\n")
    
    # Procesar acciones con rate limiting conservador
    enriched_stocks = process_stocks_batch(stocks, max_workers=2, delay_between_requests=0.5)
    
    # Guardar resultados
    print(f"\n💾 Guardando resultados en {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(enriched_stocks, f, indent=2, ensure_ascii=False)
    
    # Calcular estadísticas
    stats = {
        'total': len(enriched_stocks),
        'con_datos': sum(1 for s in enriched_stocks if not s.get('error')),
        'con_errores': sum(1 for s in enriched_stocks if s.get('error')),
        'con_market_cap': sum(1 for s in enriched_stocks if s.get('marketCap')),
        'con_exchange': sum(1 for s in enriched_stocks if s.get('exchange')),
        'con_pais': sum(1 for s in enriched_stocks if s.get('country')),
        'con_sector': sum(1 for s in enriched_stocks if s.get('sector')),
        'fecha_procesamiento': datetime.now().isoformat(),
    }
    
    # Guardar estadísticas
    print(f"📈 Guardando estadísticas en {stats_file}")
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    
    # Mostrar resumen
    print("\n" + "="*50)
    print("RESUMEN DE PROCESAMIENTO")
    print("="*50)
    print(f"Total procesadas: {stats['total']}")
    print(f"Con datos completos: {stats['con_datos']}")
    print(f"Con errores: {stats['con_errores']}")
    print(f"Con Market Cap: {stats['con_market_cap']}")
    print(f"Con Exchange: {stats['con_exchange']}")
    print(f"Con País: {stats['con_pais']}")
    print(f"Con Sector: {stats['con_sector']}")
    print("="*50)


if __name__ == '__main__':
    main()


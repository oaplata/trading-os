#!/usr/bin/env python3
"""
Script para escanear acciones de Quantfury (NYSE, NASDAQ) y ETFs,
y detectar cuáles acaban de confirmar un pivote (alto o bajo) de 10 velas en temporalidad 1d.
"""

import json
import time
import sys
from pathlib import Path
import yfinance as yf
import pandas as pd
import numpy as np
from scipy.signal import argrelextrema
import warnings
from requests.exceptions import HTTPError

warnings.filterwarnings('ignore')

SCRIPT_DIR = Path(__file__).parent.absolute()
QUANTFURY_DIR = SCRIPT_DIR.parent / 'quantfury'

def cargar_activos():
    stocks_file = QUANTFURY_DIR / 'stocks.json'
    etfs_file = QUANTFURY_DIR / 'etfs.json'
    activos = []

    if stocks_file.exists():
        with open(stocks_file, 'r', encoding='utf-8') as f:
            stocks = json.load(f)
            for s in stocks:
                if s.get('exchange') in ['NYSE', 'NASDAQ'] and s.get('error') is None:
                    activos.append({'ticker': s['ticker'], 'name': s['name'], 'tipo': 'stock'})
    else:
        print(f"Error: No se encontró {stocks_file}")
                    
    if etfs_file.exists():
        with open(etfs_file, 'r', encoding='utf-8') as f:
            etfs = json.load(f)
            for e in etfs:
                activos.append({'ticker': e['ticker'], 'name': e['name'], 'tipo': 'etf'})
    else:
        print(f"Error: No se encontró {etfs_file}")
                
    return activos

def check_pivot_confirmed(df, window=10):
    if len(df) < window * 2 + 1:
        return None
        
    highs = df['High'].values
    lows = df['Low'].values
    
    # argrelextrema calculation
    highs_idx = argrelextrema(highs, np.greater_equal, order=window)[0]
    lows_idx = argrelextrema(lows, np.less_equal, order=window)[0]
    
    # La última vela tiene índice len(df) - 1.
    # Para que el pivote de window=10 se confirme en la última vela,
    # el pivote tuvo que suceder exactamente hace 'window' velas.
    last_candle_idx = len(df) - 1
    target_pivot_idx = last_candle_idx - window
    
    signals = []
    
    if len(highs_idx) > 0 and highs_idx[-1] == target_pivot_idx:
        signals.append({
            'type': 'Pivot High',
            'date': df.index[target_pivot_idx].strftime('%Y-%m-%d'),
            'price': round(float(highs[target_pivot_idx]), 2)
        })
        
    if len(lows_idx) > 0 and lows_idx[-1] == target_pivot_idx:
        signals.append({
            'type': 'Pivot Low',
            'date': df.index[target_pivot_idx].strftime('%Y-%m-%d'),
            'price': round(float(lows[target_pivot_idx]), 2)
        })
        
    return signals if signals else None

def save_historical_data(ticker, window):
    import os
    import io, contextlib
    print(f"\n      [+] Guardando historial (pivotes y velas) para {ticker}...", end="", flush=True)
    
    f = io.StringIO()
    with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
        df = yf.download(ticker, period="max", interval="1d", progress=False)
        
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna(subset=['High', 'Low'])
    if df.empty:
        print(" Error: Sin datos.", end="")
        return
        
    highs_idx = argrelextrema(df['High'].values, np.greater_equal, order=window)[0]
    lows_idx = argrelextrema(df['Low'].values, np.less_equal, order=window)[0]
    
    last_candle_idx = len(df) - 1
    pivots = []
    
    for idx in highs_idx:
        if last_candle_idx - idx >= window:
            date_str = df.index[idx].strftime('%Y-%m-%d')
            price = df['High'].iloc[idx]
            if isinstance(price, pd.Series): price = price.iloc[0]
            pivots.append({'date': date_str, 'price': round(float(price), 6), 'type': 'alto'})
            
    for idx in lows_idx:
        if last_candle_idx - idx >= window:
            date_str = df.index[idx].strftime('%Y-%m-%d')
            price = df['Low'].iloc[idx]
            if isinstance(price, pd.Series): price = price.iloc[0]
            pivots.append({'date': date_str, 'price': round(float(price), 6), 'type': 'bajo'})
            
    pivots_df = pd.DataFrame(pivots)
    if pivots_df.empty:
        print(" Error: Sin pivotes.", end="")
        return
        
    pivots_df['date_dt'] = pd.to_datetime(pivots_df['date'])
    pivots_df = pivots_df.sort_values(by=['date_dt', 'type']).drop(columns=['date_dt'])
    pivots_df = pivots_df.drop_duplicates(subset=['date', 'type'])
    
    output_dir = SCRIPT_DIR / "pivotes"
    os.makedirs(output_dir, exist_ok=True)
    
    pivots_csv = output_dir / f"{ticker}.csv"
    pivots_df.to_csv(pivots_csv, index=False)
    
    last_pivot_date = pivots_df.iloc[-1]['date']
    df_recent = df.loc[last_pivot_date:]
    
    candles_csv = output_dir / f"{ticker}_velas.csv"
    df_recent.to_csv(candles_csv)
    print(" Hecho.", end="")

def main():
    activos = cargar_activos()
    print(f"\n=========================================")
    print(f"Total de activos a escanear: {len(activos)}")
    print(f"Temporalidad: 1d | Pivotes: 10 velas")
    print(f"=========================================\n")
    
    window = 10
    batch_size = 50
    delay_between_batches = 2.0  # Segundos para evitar baneos (Rate Limiting)
    
    tickers_list = [a['ticker'] for a in activos]
    result_signals = []
    errors_list = []
    
    # Iterar por bloques
    total_batches = (len(tickers_list) + batch_size - 1) // batch_size
    
    for i in range(0, len(tickers_list), batch_size):
        batch = tickers_list[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Procesando batch de {len(batch)} activos...", flush=True)
        
        try:
            # Descargar historial silenciando warnings de consola
            import io, contextlib
            f = io.StringIO()
            with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
                data = yf.download(
                    batch, 
                    period="6mo", 
                    interval="1d", 
                    group_by='ticker', 
                    progress=False, 
                    threads=True
                )
            
            if hasattr(yf.shared, '_ERRORS'):
                for err_ticker in yf.shared._ERRORS.keys():
                    if err_ticker not in errors_list:
                        errors_list.append(err_ticker)
            
            # yfinance devuelve MultiIndex si hay varios tickers
            # o si hay 1 ticker pero group_by='ticker' se comportó diferente en la versión
            is_multi = isinstance(data.columns, pd.MultiIndex)
            
            for ticker in batch:
                if is_multi:
                    # Validar si el ticker descargó datos válidos
                    if ticker not in data.columns.levels[0]:
                        if ticker not in errors_list:
                            errors_list.append(ticker)
                        continue
                    df = data[ticker]
                else:
                    df = data
                
                df = df.dropna(subset=['High', 'Low'])
                if df.empty:
                    if ticker not in errors_list:
                        errors_list.append(ticker)
                    continue
                    
                signals = check_pivot_confirmed(df, window)
                if signals:
                    name = next(a['name'] for a in activos if a['ticker'] == ticker)
                    for s in signals:
                        result_signals.append({
                            'ticker': ticker,
                            'name': name,
                            'signal': s['type'],
                            'date': s['date'],
                            'price': s['price']
                        })
                        print(f"\n  -> ¡SEÑAL! {ticker} ({name}) : {s['type']} confirmado hoy (Pivote de {s['date']} a ${s['price']})", end="")
                    save_historical_data(ticker, window)
            
        except HTTPError as e:
            if e.response.status_code == 429:
                print(f"\n[!] Rate Limit alcanzado (429). Esperando 30 segundos...")
                time.sleep(30)
                # Omitimos reintentar el mismo batch por simplicidad, aunque lo ideal sería hacerlo.
            else:
                print(f"\nError HTTP: {e}")
        except Exception as e:
            print(f"\nError en batch: {e}")
            
        # Respetar rate limit entre batches
        if batch_num < total_batches:
            time.sleep(delay_between_batches)
            
    # Mostrar resumen
    print(f"\n\n=========================================")
    print(f"         RESUMEN DE SEÑALES DETECTADAS       ")
    print(f"=========================================")
    
    if not result_signals:
        print("No se encontraron señales de pivotes confirmados en la última vela.")
    else:
        for r in result_signals:
            print(f"{r['ticker']:<8} | {r['signal']:<10} | Pivote: {r['date']} | Precio: ${r['price']} | {r['name']}")
            
    if errors_list:
        print(f"\n=========================================")
        print(f"         ACTIVOS CON ERRORES ({len(errors_list)})       ")
        print(f"=========================================")
        for j in range(0, len(errors_list), 10):
            print(", ".join(errors_list[j:j+10]))
            
    # Guardar a JSON
    output_file = SCRIPT_DIR / 'señales_pivotes.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result_signals, f, indent=2, ensure_ascii=False)
    
    print(f"\nResultados guardados en: {output_file}")

if __name__ == '__main__':
    main()

import sys
import argparse
import os
import yfinance as yf
import pandas as pd
import numpy as np
from scipy.signal import argrelextrema

def calculate_pivots(ticker, window):
    print(f"Descargando datos históricos para {ticker}...")
    # Descargar todo el historial en temporalidad de 1 día
    df = yf.download(ticker, period="max", interval="1d")
    
    if df.empty:
        print(f"No se encontraron datos para el activo {ticker}.")
        return

    # yfinance puede devolver MultiIndex en columnas en sus últimas versiones
    # Simplificamos las columnas a un solo nivel si es necesario
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    
    # Asegurarnos de que no hay NaN en High/Low para calcular correctamente
    df = df.dropna(subset=['High', 'Low'])
    
    print(f"Calculando pivotes con window={window}...")
    # Calcular los índices de los máximos y mínimos locales usando argrelextrema
    # order=window compara el punto con 'window' puntos a la izquierda y derecha
    highs_idx = argrelextrema(df['High'].values, np.greater_equal, order=window)[0]
    lows_idx = argrelextrema(df['Low'].values, np.less_equal, order=window)[0]
    
    pivots = []
    
    # Recopilar los pivotes altos
    for idx in highs_idx:
        date_str = df.index[idx].strftime('%Y-%m-%d')
        # Extraer el valor numérico en caso de que sea una Serie (para yfinance)
        price = df['High'].iloc[idx]
        if isinstance(price, pd.Series):
            price = price.iloc[0]
            
        pivots.append({
            'date': date_str,
            'price': round(float(price), 6),
            'type': 'alto'
        })
        
    # Recopilar los pivotes bajos
    for idx in lows_idx:
        date_str = df.index[idx].strftime('%Y-%m-%d')
        price = df['Low'].iloc[idx]
        if isinstance(price, pd.Series):
            price = price.iloc[0]
            
        pivots.append({
            'date': date_str,
            'price': round(float(price), 6),
            'type': 'bajo'
        })
        
    if not pivots:
        print(f"No se encontraron pivotes para la ventana de {window}.")
        return
        
    # Crear DataFrame y ordenar por fecha
    pivots_df = pd.DataFrame(pivots)
    pivots_df['date_dt'] = pd.to_datetime(pivots_df['date'])
    pivots_df = pivots_df.sort_values(by=['date_dt', 'type']).drop(columns=['date_dt'])
    
    # Eliminar posibles duplicados si un punto fue calculado como varios dependiendo de los datos
    pivots_df = pivots_df.drop_duplicates(subset=['date', 'type'])
    
    # Asegurar el directorio de salida
    # Obtenemos la ruta absoluta de la carpeta 'pivotes' al mismo nivel que este script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "pivotes")
    os.makedirs(output_dir, exist_ok=True)
    
    # Guardar a CSV
    output_path = os.path.join(output_dir, f"{ticker}.csv")
    pivots_df.to_csv(output_path, index=False)
    
    print(f"¡Éxito! Se han guardado {len(pivots_df)} pivotes en: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calcula los pivotes (altos y bajos) de un activo financiero.")
    parser.add_argument("ticker", type=str, help="El símbolo del activo (ejemplo: AAPL, BTC-USD)")
    parser.add_argument("window", type=int, help="Tamaño de la ventana (window) para calcular los pivotes")
    
    args = parser.parse_args()
    
    if args.window < 1:
        print("Error: El tamaño the window debe ser al menos 1.")
        sys.exit(1)
        
    calculate_pivots(args.ticker, args.window)

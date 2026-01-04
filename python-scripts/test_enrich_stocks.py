#!/usr/bin/env python3
"""
Script de prueba para enriquecer datos de acciones.

Este script prueba el enriquecimiento con solo las primeras 10 acciones
para validar que todo funciona correctamente antes de procesar todas.
"""

import json
from pathlib import Path
from enrich_stocks import enrich_stock_data, process_stocks_batch

def main():
    """Función principal del script de prueba."""
    # Rutas de archivos
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    input_file = project_root / 'quantfury' / 'stocks.json'
    output_file = project_root / 'quantfury' / 'stocks_enriched_test.json'
    
    # Verificar que existe el archivo de entrada
    if not input_file.exists():
        print(f"Archivo no encontrado: {input_file}")
        return
    
    # Cargar datos de entrada
    print(f"Cargando datos de {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        stocks = json.load(f)
    
    # Procesar solo las primeras 10 acciones para prueba
    test_stocks = stocks[:10]
    print(f"Procesando {len(test_stocks)} acciones de prueba...")
    
    # Procesar acciones
    enriched_stocks = process_stocks_batch(test_stocks, max_workers=3)
    
    # Guardar resultados
    print(f"Guardando resultados en {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(enriched_stocks, f, indent=2, ensure_ascii=False)
    
    # Mostrar resultados
    print("\n" + "="*50)
    print("RESULTADOS DE PRUEBA")
    print("="*50)
    for stock in enriched_stocks:
        print(f"\nTicker: {stock.get('ticker')}")
        print(f"  Nombre: {stock.get('name')}")
        print(f"  Market Cap: {stock.get('marketCap')}")
        print(f"  Exchange: {stock.get('exchange')}")
        print(f"  País: {stock.get('country')}")
        print(f"  País Bolsa: {stock.get('exchangeCountry')}")
        print(f"  Sector: {stock.get('sector')}")
        if stock.get('error'):
            print(f"  ERROR: {stock.get('error')}")
    print("="*50)

if __name__ == '__main__':
    main()


> **Instrucción:** Actúa como un Analista de Datos Financieros y Desarrollador Full-stack. Tu tarea es enriquecer una lista JSON de activos (Acciones o ETFs) disponibles en Quantfury.
>
> **Reglas de Procesamiento:**
> Identifica el activo y añade las siguientes llaves:
>
> 1.  `"type"`: (String) 'Stock' o 'ETF'.
> 2.  `"exchange"`: (String) La bolsa principal (ej: 'NASDAQ', 'NYSE', 'BME', 'B3').
> 3.  `"mic_code"`: (String) El Market Identifier Code (ej: 'XNAS', 'XNYS', 'XMAD', 'BVMF').
> 4.  `"category"`: (String) 'Equity', 'Fixed Income', 'Commodities', o 'Crypto'.
> 5.  `"sector"`: (String) Sector industrial o enfoque del ETF.
> 6.  `"industry_group"`: (String) Sub-categoría específica.
> 7.  `"region_exposure"`: (String) País o mercado de impacto.
> 8.  `"market_cap_approx"`: (Number) Valor de mercado o AUM en USD (ej: 2500000000). Si no está disponible, pon `null`.
> 9.  `"volatility_class"`: (String) 'Low', 'Medium', 'High'.
> 10. `"is_leveraged"`: (Boolean) `true` si es apalancado/inverso.
> 11. `"description"`: (String) Breve resumen del activo.
>
> **Condiciones Técnicas:**
> * Mantén `ticker` y `name`.
> * Devuelve **exclusivamente** el bloque de código JSON limpio.
> * No añadas texto ni explicaciones.
>
> **Lista de entrada:** > 

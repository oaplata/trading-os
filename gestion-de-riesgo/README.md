# Gestión de Riesgo - Trading

Aplicación web para gestión de riesgo de trading, que replica la funcionalidad de un Excel para registro de operaciones con cálculo automático de métricas de riesgo y ganancias.

## 🚀 Características

- ✅ Autenticación por Email/Password con Firebase
- ✅ Registro de operaciones de trading (LONG/SHORT)
- ✅ **Estados avanzados**: ABIERTA, BREAKEVEN, PARCIAL, STOPLOSS, CERRADA, CERRADA_BREAKEVEN
- ✅ **Sistema de eventos**: Targets parciales ilimitados y toma de ganancias
- ✅ **Gestión de eventos**: PARTIAL_TP, FINAL_TP, STOPLOSS, MOVE_TO_BE, CLOSE_BE, MANUAL_ADJUST
- ✅ Cálculo automático de métricas:
  - Riesgo por operación (USD y %) - solo operaciones ABIERTA
  - Ganancias realizadas (USD y %) - basadas en eventos
  - Ganancias flotantes (USD y %) - basadas en tamaño restante
  - Capitalizado y Capital Flotante
  - Riesgo global del portfolio (solo ABIERTA)
- ✅ Tamaño restante automático (`remainingSizeUsd`) basado en eventos
- ✅ Filtrado de operaciones por estado
- ✅ CRUD completo de operaciones y eventos
- ✅ Multi-tenant: cada usuario tiene su propio registro privado
- ✅ UI responsive con TailwindCSS (mobile-first)

## 📋 Requisitos

- Node.js 18+ y npm/yarn
- Cuenta de Firebase con:
  - Authentication habilitado (Email/Password)
  - Firestore Database configurado
  - Reglas de seguridad configuradas (ver más abajo)

## 🔧 Configuración

### 1. Clonar y instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication → Sign-in method → Email/Password
3. Crea una base de datos Firestore (modo de prueba inicialmente)
4. Obtén las credenciales de Firebase desde: Project Settings → General → Your apps → Config

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_API_KEY="tu-api-key"
VITE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
VITE_PROJECT_ID="tu-proyecto-id"
VITE_STORAGE_BUCKET="tu-proyecto.appspot.com"
VITE_MESSAGING_SENDER_ID="tu-sender-id"
VITE_APP_ID="tu-app-id"
VITE_MEASUREMENT_ID="tu-measurement-id"
```

**Nota:** Todas las variables deben empezar con `VITE_` para que Vite las exponga al frontend.

### 4. Configurar reglas de Firestore

**⚠️ IMPORTANTE**: Debes configurar las reglas de Firestore para permitir el acceso a la subcolección `events`.

En Firebase Console → Firestore Database → Rules, usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios: solo pueden leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Operaciones: solo pueden acceder a sus propias operaciones
      match /operations/{operationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Eventos: solo pueden acceder a eventos de sus propias operaciones
        match /events/{eventId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

**Nota**: Si ves errores "Missing or insufficient permissions" en la consola al cargar eventos, significa que las reglas de Firestore no están configuradas correctamente. Asegúrate de publicar las reglas después de actualizarlas.

## 🏃 Cómo correr

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Producción

```bash
npm run build
npm run preview
```

## 📖 Modelo de Datos

### Estructura Firestore

```
users/{uid}
  - email: string
  - createdAt: timestamp
  - initialCapital: number

users/{uid}/operations/{operationId}
  - symbol: string (ej: "BTCUSDT")
  - direction: "LONG" | "SHORT"
  - status: "ABIERTA" | "BREAKEVEN" | "PARCIAL" | "STOPLOSS" | "CERRADA" | "CERRADA_BREAKEVEN"
  - entryPrice: number
  - stopPrice: number
  - positionSizeUsd: number (tamaño inicial total)
  - currentPrice: number | null (para calcular flotante)
  - openedAt: string (fecha ingresada por usuario, formato 'YYYY-MM-DD')
  - notes: string | null
  - createdAt: timestamp
  - updatedAt: timestamp

users/{uid}/operations/{operationId}/events/{eventId}
  - type: "PARTIAL_TP" | "FINAL_TP" | "STOPLOSS" | "MOVE_TO_BE" | "CLOSE_BE" | "MANUAL_ADJUST"
  - date: string (fecha ingresada por usuario)
  - price: number | null (requerido para PARTIAL_TP, FINAL_TP, STOPLOSS, CLOSE_BE)
  - sizeUsd: number | null (requerido para PARTIAL_TP, FINAL_TP)
  - note: string | null
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Nota:** El estado de la operación se calcula automáticamente basado en los eventos. El tamaño restante (`remainingSizeUsd`) se calcula restando los `sizeUsd` de eventos PARTIAL_TP y FINAL_TP del `positionSizeUsd` inicial.

### Cálculos Derivados

El sistema calcula automáticamente:

- **remainingSizeUsd**: Tamaño restante = `positionSizeUsd - SUM(sizeUsd de eventos PARTIAL_TP y FINAL_TP)`
- **riskUsd**: Riesgo en USD por operación (solo si `status == ABIERTA`, usa `remainingSizeUsd`)
- **totalRealizedUsd**: Ganancias realizadas basadas en eventos (PARTIAL_TP, FINAL_TP, STOPLOSS, CLOSE_BE)
- **totalFloatingUsd**: Ganancias flotantes (solo si `remainingSizeUsd > 0` y estado abierto)

**Estados y Riesgo Global:**
- Solo operaciones con `status == ABIERTA` suman al Riesgo Global
- Operaciones en BREAKEVEN, PARCIAL o cerradas NO suman al riesgo

Ver [docs/formulas.md](./docs/formulas.md) para detalles completos de las fórmulas y eventos.

## 📊 Métricas del Resumen

- **Capital Inicial**: Capital inicial configurado por el usuario
- **Ganancias Realizadas ($)**: Suma de ganancias realizadas de todas las operaciones (basadas en eventos)
- **Ganancias Realizadas (%)**: `(GananciasRealizadas / CapitalInicial) * 100`
- **Capitalizado**: `CapitalInicial + GananciasRealizadas`
- **Ganancias Flotantes ($)**: Suma de ganancias flotantes de operaciones con `remainingSizeUsd > 0`
- **Ganancias Flotantes (%)**: `(GananciasFlotantes / Capitalizado) * 100`
- **Capital Flotante**: `Capitalizado + GananciasFlotantes`
- **Riesgo Global ($)**: Suma de riesgo **SOLO de operaciones con status == ABIERTA**
- **Riesgo Global (%)**: `(RiesgoGlobal / Capitalizado) * 100`

## 🏗️ Arquitectura

- **Frontend**: Vue 3 (Composition API) + Vite + TailwindCSS
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: Pinia
- **Routing**: Vue Router

### Estructura de Carpetas

```
src/
  ├── components/       # Componentes reutilizables
  ├── services/         # Servicios de Firebase (auth, operations, user)
  ├── stores/           # Stores de Pinia (authStore, operationsStore)
  ├── views/            # Vistas/páginas (Login, Register, App)
  ├── router/           # Configuración de rutas
  ├── styles/           # Estilos globales
  └── main.js           # Punto de entrada
```

## 🔐 Seguridad

- Cada usuario solo puede acceder a sus propios datos (`users/{uid}` y `users/{uid}/operations/*`)
- Las reglas de Firestore garantizan el aislamiento de datos
- La autenticación es manejada por Firebase Auth

## 📝 Validaciones

- Precios y montos deben ser > 0
- `openedAt` (fecha de apertura) es obligatoria
- `stopPrice` es obligatorio en todas las operaciones
- `direction` solo puede ser "LONG" o "SHORT"
- `status` inicial puede ser cualquiera, pero se actualiza automáticamente con eventos
- Eventos PARTIAL_TP y FINAL_TP requieren `price` y `sizeUsd`
- Eventos STOPLOSS y CLOSE_BE requieren `price`
- `sizeUsd` en eventos no puede exceder `remainingSizeUsd`
- El estado se calcula automáticamente basado en eventos (no se edita manualmente si hay eventos)

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"
- Verifica que las reglas de Firestore estén configuradas correctamente
- Asegúrate de estar autenticado

### Error: "Firebase: Error (auth/invalid-api-key)"
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que todas las variables empiecen con `VITE_`

### No se cargan las operaciones
- Verifica la consola del navegador para errores
- Asegúrate de que Firestore esté habilitado en Firebase Console

## 🔔 Cloud Functions - Sistema de Cola para Notificaciones a Telegram

El proyecto incluye un sistema de cola + worker para manejar webhooks de TradingView de forma robusta, evitando pérdida de señales cuando se disparan múltiples alertas simultáneamente.

### Arquitectura

El sistema está dividido en dos funciones:

1. **`notifyTelegram` (Ingesta)**: HTTP endpoint que valida y encola eventos en Realtime Database
2. **`processTelegramQueue` (Worker)**: Scheduled function que procesa la cola cada 1 minuto

### ¿Cómo evita pérdida de señales?

- **Cola persistente**: Todos los eventos se guardan en Realtime Database antes de enviar
- **Rate limiting inteligente**: El worker envía 1 mensaje por segundo y respeta `retry_after` de Telegram
- **Reintentos automáticos**: Hasta 5 intentos con backoff exponencial
- **Deduplicación**: Evita procesar el mismo evento múltiples veces
- **Manejo de 429**: Si Telegram limita, espera el tiempo indicado y reintenta

### Configuración

1. **Habilitar Realtime Database:**
   - Ve a Firebase Console → Realtime Database
   - Crea una base de datos (modo bloqueado está bien, las funciones tienen acceso)

2. **Instalar dependencias de functions:**
   ```bash
   cd functions
   npm install
   cd ..
   ```

3. **Configurar secrets en Firebase:**
   ```bash
   # Token del bot de Telegram (obtener de @BotFather)
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   
   # Chat ID del grupo (puedes obtenerlo con @userinfobot o desde la API)
   firebase functions:secrets:set TELEGRAM_CHAT_ID
   
   # Secret para autenticar requests (elige un valor aleatorio seguro)
   firebase functions:secrets:set WEBHOOK_SECRET
   ```

4. **Desplegar ambas funciones:**
   ```bash
   firebase deploy --only functions:notifyTelegram,functions:processTelegramQueue
   ```

### Uso

**Endpoint de ingesta (`notifyTelegram`):**

**Headers:**
- `Content-Type: application/json` (requerido)

**Body JSON:**
```json
{
  "secret": "MI_SECRETO_PRIVADO" (requerido, debe coincidir con WEBHOOK_SECRET),
  "ticker": "SPY" (requerido, símbolo del activo),
  "timeframe": "1H" (opcional, default "1D"),
  "barTime" o "time" (opcional, para deduplicación perfecta)
}
```

**Ejemplo con curl:**
```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/notifyTelegram \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "MI_SECRETO_PRIVADO",
    "ticker": "SPY",
    "timeframe": "1H"
  }'
```

**Configuración en TradingView:**
1. Ve a tu alerta en TradingView
2. Configura el webhook con:
   - **URL**: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/notifyTelegram`
   - **Method**: `POST`
   - **Body (JSON)**:
   ```json
   {
     "secret": "MI_SECRETO_PRIVADO",
     "ticker": "{{ticker}}",
     "timeframe": "{{interval}}"
   }
   ```

**Respuestas:**
- `200 OK`: `{"ok": true, "enqueued": true}` - Evento encolado exitosamente
- `200 OK`: `{"ok": true, "deduped": true}` - Evento duplicado (ya estaba en cola)
- `401 Unauthorized`: `{"ok": false, "error": "Unauthorized"}` - Secret inválido
- `4xx/5xx`: `{"ok": false, "error": "mensaje de error"}` - Otros errores

### Formato del mensaje en Telegram

El mensaje se envía en formato simple de 2 líneas:
```
🚨 Señal activa
📈 SPY (1H)
```

### Estructura de la Cola (Realtime Database)

Los eventos se almacenan en:
- `/telegramQueue/pending/{eventId}` - Eventos pendientes
- `/telegramQueue/processing/{eventId}` - Eventos siendo procesados
- `/telegramQueue/sent/{eventId}` - Eventos enviados exitosamente
- `/telegramQueue/failed/{eventId}` - Eventos que fallaron después de 5 intentos

### Características del Worker

- **Frecuencia**: Corre cada 1 minuto
- **Límite por ejecución**: Procesa hasta 60 items
- **Tiempo máximo**: 50 segundos por ejecución
- **Rate limiting**: 1 mensaje por segundo
- **Manejo de 429**: Respeta `retry_after` de Telegram y espera antes de continuar
- **Backoff exponencial**: 10s → 30s → 2m → 5m para errores no relacionados con rate limit
- **Máximo de intentos**: 5 intentos por evento

### Deduplicación

El sistema genera un `eventId` determinístico:
- Si TradingView envía `barTime` o `time`: usa `SHA1(ticker + timeframe + barTime)` para dedupe perfecto
- Si no hay `barTime`: usa `SHA1(ticker + timeframe + createdAtRedondeadoA5s)` para dedupe parcial

Si un evento ya existe en `pending`, `processing` o `sent`, se responde `200 OK` con `deduped: true`.

### Notas

- La función usa Firebase Functions v2 con Node.js 24
- Todos los secrets se gestionan de forma segura (no hardcodeados)
- La autenticación se realiza mediante el campo `secret` en el body (compatible con TradingView)
- El mensaje se envía como texto plano (sin parse_mode) para evitar problemas de escape
- El worker es idempotente y maneja concurrencia usando transacciones de Realtime Database

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o PR si encuentras problemas o mejoras.

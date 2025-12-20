# Variables de Entorno - Trading OS Backend

## Resumen

Este documento describe todas las variables de entorno necesarias para el funcionamiento del backend.

## Variables Requeridas

### Base de Datos

#### `DATABASE_URL`
- **Tipo**: String
- **Requerido**: Sí
- **Descripción**: URL de conexión a PostgreSQL
- **Formato**: `postgresql://user:password@host:port/database?schema=public`
- **Ejemplo**: `postgresql://trading_os_user:trading_os_password@localhost:5432/trading_os?schema=public`
- **Nota**: Usa las credenciales definidas en `docker-compose.yml` para desarrollo local

### Autenticación JWT

#### `JWT_SECRET`
- **Tipo**: String
- **Requerido**: Sí
- **Descripción**: Secreto para firmar access tokens JWT
- **Recomendación**: Mínimo 32 caracteres, usar un generador de secretos seguro
- **Ejemplo**: `your-super-secret-jwt-key-change-in-production-min-32-chars`
- **⚠️ IMPORTANTE**: Cambiar en producción por un valor seguro y único

#### `JWT_EXPIRATION`
- **Tipo**: String
- **Requerido**: No (default: "15m")
- **Descripción**: Tiempo de expiración del access token
- **Formato**: Número seguido de unidad (s, m, h, d)
- **Ejemplos**: `15m`, `1h`, `30s`
- **Recomendación**: 15 minutos para balance entre seguridad y UX

#### `REFRESH_TOKEN_SECRET`
- **Tipo**: String
- **Requerido**: Sí
- **Descripción**: Secreto para firmar refresh tokens (debe ser diferente a JWT_SECRET)
- **Recomendación**: Mínimo 32 caracteres, diferente a JWT_SECRET
- **Ejemplo**: `your-super-secret-refresh-token-key-change-in-production`
- **⚠️ IMPORTANTE**: Cambiar en producción por un valor seguro y único

#### `REFRESH_TOKEN_EXPIRATION`
- **Tipo**: String
- **Requerido**: No (default: "7d")
- **Descripción**: Tiempo de expiración del refresh token
- **Formato**: Número seguido de unidad (s, m, h, d)
- **Ejemplos**: `7d`, `30d`, `90d`
- **Recomendación**: 7 días para balance entre seguridad y UX

### Aplicación

#### `NODE_ENV`
- **Tipo**: String
- **Requerido**: No (default: "development")
- **Valores**: `development` | `production` | `test`
- **Descripción**: Ambiente de ejecución
- **Efectos**:
  - `development`: Swagger habilitado, mensajes de error detallados
  - `production`: Swagger deshabilitado, mensajes de error ocultos
  - `test`: Configuración para tests

#### `PORT`
- **Tipo**: Number
- **Requerido**: No (default: 3000)
- **Descripción**: Puerto donde corre el servidor
- **Ejemplo**: `3000`

### Rate Limiting

#### `THROTTLE_TTL`
- **Tipo**: Number
- **Requerido**: No (default: 60000)
- **Descripción**: Tiempo en milisegundos para la ventana de rate limiting
- **Ejemplo**: `60000` (1 minuto)
- **Nota**: Usado por @nestjs/throttler

#### `THROTTLE_LIMIT`
- **Tipo**: Number
- **Requerido**: No (default: 10)
- **Descripción**: Número máximo de requests permitidas en la ventana de tiempo
- **Ejemplo**: `10` (10 requests por minuto por defecto)

### Redis (Opcional)

#### `REDIS_HOST`
- **Tipo**: String
- **Requerido**: No (default: "localhost")
- **Descripción**: Host de Redis
- **Ejemplo**: `localhost` o `redis.example.com`

#### `REDIS_PORT`
- **Tipo**: Number
- **Requerido**: No (default: 6379)
- **Descripción**: Puerto de Redis
- **Ejemplo**: `6379`

#### `REDIS_PASSWORD`
- **Tipo**: String
- **Requerido**: No
- **Descripción**: Contraseña de Redis (si está protegido)
- **Ejemplo**: `your-redis-password`

### CORS

#### `CORS_ORIGIN`
- **Tipo**: String
- **Requerido**: No (default: "http://localhost:5173")
- **Descripción**: Orígenes permitidos para CORS (separados por coma)
- **Ejemplo**: `http://localhost:5173` o `http://localhost:5173,https://app.example.com`
- **Nota**: En desarrollo, se permiten requests sin origin

### Email (Opcional - MVP)

#### `SMTP_HOST`
- **Tipo**: String
- **Requerido**: No
- **Descripción**: Host del servidor SMTP
- **Ejemplo**: `smtp.gmail.com` o `smtp.sendgrid.net`

#### `SMTP_PORT`
- **Tipo**: Number
- **Requerido**: No
- **Descripción**: Puerto del servidor SMTP
- **Ejemplo**: `587` (TLS) o `465` (SSL)

#### `SMTP_USER`
- **Tipo**: String
- **Requerido**: No
- **Descripción**: Usuario del servidor SMTP
- **Ejemplo**: `your-email@gmail.com`

#### `SMTP_PASSWORD`
- **Tipo**: String
- **Requerido**: No
- **Descripción**: Contraseña del servidor SMTP
- **Ejemplo**: `your-smtp-password`

#### `SMTP_FROM`
- **Tipo**: String
- **Requerido**: No
- **Descripción**: Email remitente
- **Ejemplo**: `noreply@tradingos.com`

**Nota**: En MVP, el envío de emails está preparado pero puede usar logs. Para producción, configurar un servicio SMTP real.

## Archivo .env.example

El archivo `.env.example` contiene un template con todas las variables necesarias:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trading_os?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="15m"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key-change-in-production"
REFRESH_TOKEN_EXPIRATION="7d"

# Application
NODE_ENV="development"
PORT=3000

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Redis (opcional)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# CORS
CORS_ORIGIN="http://localhost:5173"

# Email (opcional - MVP puede ser log)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

## Configuración por Ambiente

### Desarrollo Local

```env
NODE_ENV=development
DATABASE_URL="postgresql://trading_os_user:trading_os_password@localhost:5432/trading_os?schema=public"
CORS_ORIGIN="http://localhost:5173"
```

### Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@prod-db-host:5432/trading_os?schema=public"
CORS_ORIGIN="https://app.tradingos.com"
JWT_SECRET="<generar-secreto-seguro-32-chars-min>"
REFRESH_TOKEN_SECRET="<generar-secreto-seguro-diferente-32-chars-min>"
# Configurar SMTP real
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
SMTP_FROM="noreply@tradingos.com"
```

## Seguridad

### ⚠️ Variables Sensibles

Las siguientes variables contienen información sensible y **NUNCA** deben:
- Subirse a repositorios públicos
- Compartirse en mensajes o emails
- Exponerse en logs o errores

- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `DATABASE_URL` (contiene password)
- `SMTP_PASSWORD`
- `REDIS_PASSWORD`

### Generación de Secretos

Para generar secretos seguros:

```bash
# Usando OpenSSL
openssl rand -base64 32

# Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Gestión de Secretos en Producción

Recomendaciones:
- Usar un gestor de secretos (AWS Secrets Manager, HashiCorp Vault, etc.)
- Usar variables de entorno del sistema operativo
- Usar archivos `.env` con permisos restrictivos (chmod 600)
- Rotar secretos periódicamente

## Validación

El sistema valida que las variables requeridas estén presentes al iniciar. Si falta alguna, la aplicación no iniciará y mostrará un error claro.

## Troubleshooting

### Error: "DATABASE_URL is required"
- Verifica que el archivo `.env` existe
- Verifica que `DATABASE_URL` está definida
- Verifica que no hay espacios alrededor del `=`

### Error: "JWT_SECRET is required"
- Define `JWT_SECRET` en `.env`
- Asegúrate de usar un valor seguro (mínimo 32 caracteres)

### CORS bloqueando requests
- Verifica que `CORS_ORIGIN` incluye el origen del frontend
- En desarrollo, puedes usar `*` temporalmente (no recomendado para producción)


# Guía de Setup - Backend Trading OS

## Pasos para configurar el proyecto

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
# Database
DATABASE_URL="postgresql://trading_os_user:trading_os_password@localhost:5432/trading_os?schema=public"

# JWT
JWT_SECRET="cambiar-este-secreto-en-produccion-minimo-32-caracteres"
JWT_EXPIRATION="15m"
REFRESH_TOKEN_SECRET="cambiar-este-secreto-refresh-en-produccion-minimo-32-caracteres"
REFRESH_TOKEN_EXPIRATION="7d"

# Application
NODE_ENV="development"
PORT=3000

# Rate Limiting
THROTTLE_TTL=60000        # Tiempo en milisegundos (1 minuto)
THROTTLE_LIMIT=10         # Número de requests permitidas

# Redis (opcional para cache y jobs)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# CORS
CORS_ORIGIN="http://localhost:5173"  # Múltiples orígenes separados por coma

# Email (para recuperación de contraseña - MVP puede ser log)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

**⚠️ IMPORTANTE:** Cambia los valores de `JWT_SECRET` y `REFRESH_TOKEN_SECRET` por valores seguros y únicos.

### 3. Iniciar servicios con Docker Compose

```bash
docker-compose up -d
```

Esto iniciará:
- PostgreSQL en el puerto 5432
- Redis en el puerto 6379

Para ver los logs:
```bash
docker-compose logs -f
```

Para detener los servicios:
```bash
docker-compose down
```

### 4. Configurar Prisma

```bash
# Generar el cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones (crea las tablas en la BD)
npm run prisma:migrate
```

Cuando ejecutes `prisma:migrate`, te pedirá un nombre para la migración. Usa algo como: `init`

### 5. (Opcional) Abrir Prisma Studio

Para ver y editar la base de datos con una interfaz gráfica:

```bash
npm run prisma:studio
```

Esto abrirá una interfaz web en `http://localhost:5555`

### 6. Iniciar el servidor de desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000/api`

### 7. Verificar que funciona

```bash
# Health check
curl http://localhost:3000/api/health

# Debería responder: {"status":"ok","timestamp":"..."}
```

## Estructura creada

✅ Proyecto NestJS inicializado con TypeScript
✅ Estructura modular (auth, users, accounts, prisma)
✅ Prisma ORM configurado con PostgreSQL
✅ Schema de base de datos (User, UserSettings, RefreshToken, PasswordResetToken, Account)
✅ Docker Compose para desarrollo
✅ Variables de entorno configuradas
✅ Scripts de package.json
✅ Módulo de autenticación completo (register, login, refresh, logout, forgot/reset password)
✅ Módulo de usuarios (perfil, settings)
✅ Módulo de cuentas (básico para onboarding)
✅ JWT Strategy y Guards
✅ Validaciones con class-validator
✅ Hashing de passwords con Argon2
✅ Helmet para headers de seguridad HTTP
✅ Rate limiting (Throttler) con límites específicos por endpoint
✅ CORS configurado con soporte multi-origin
✅ Logging interceptor para monitoreo de requests
✅ Preparación para 2FA (campos en BD)

## Seguridad

El proyecto incluye múltiples capas de seguridad:
- **Helmet**: Headers de seguridad HTTP
- **Rate Limiting**: Protección contra fuerza bruta
- **CORS**: Control de orígenes permitidos
- **Validación**: Sanitización automática de inputs
- **Logging**: Monitoreo de requests y errores

Ver `SECURITY.md` para más detalles.

## Próximos pasos

1. Probar los endpoints con Postman o curl
2. Crear el frontend (Vue 3)
3. Conectar frontend con backend
4. Implementar el onboarding wizard en el frontend

## Comandos útiles

```bash
# Desarrollo
npm run start:dev          # Iniciar con hot-reload
npm run build              # Compilar
npm run start:prod         # Iniciar producción

# Base de datos
npm run prisma:migrate     # Crear nueva migración
npm run prisma:studio      # Abrir GUI de BD
npm run db:reset           # Resetear BD (cuidado!)

# Testing
npm run test               # Tests unitarios
npm run test:e2e           # Tests end-to-end
npm run test:cov           # Coverage

# Linting
npm run lint               # Ejecutar linter
npm run format             # Formatear código
```


# Seguridad y Configuración - Trading OS Backend

Este documento describe las medidas de seguridad y configuraciones implementadas en el backend.

## 🔒 Medidas de Seguridad Implementadas

### 1. Helmet - Headers de Seguridad HTTP

Helmet ayuda a proteger la aplicación de vulnerabilidades conocidas configurando varios headers HTTP.

**Configuración:**
- Content Security Policy (CSP) configurado
- XSS Protection habilitado
- MIME Type Sniffing deshabilitado
- Frame Options configurado

**Ubicación:** `src/main.ts`

### 2. Rate Limiting (Throttling)

Protección contra ataques de fuerza bruta y abuso de API mediante limitación de requests.

**Configuración Global:**
- Default: 10 requests por minuto (60000ms)
- Configurable via `THROTTLE_TTL` y `THROTTLE_LIMIT` en `.env`

**Rate Limiting Específico por Endpoint:**
- `POST /auth/register`: 3 requests por minuto
- `POST /auth/login`: 5 requests por minuto
- `POST /auth/forgot-password`: 3 requests por minuto

**Ubicación:** 
- Configuración global: `src/app.module.ts`
- Endpoints específicos: `src/auth/auth.controller.ts`

### 3. CORS (Cross-Origin Resource Sharing)

Configuración robusta de CORS para permitir solo orígenes autorizados.

**Características:**
- Soporte para múltiples orígenes (separados por coma)
- Credentials habilitados para cookies/auth
- Métodos HTTP permitidos: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers permitidos: Content-Type, Authorization
- En desarrollo, permite requests sin origin (Postman, mobile apps)

**Configuración:** Variable `CORS_ORIGIN` en `.env`

**Ubicación:** `src/main.ts`

### 4. Validación y Sanitización de Inputs

Validación automática de todos los inputs usando `class-validator` y `class-transformer`.

**Características:**
- **Whitelist**: Elimina propiedades no definidas en DTOs
- **Forbid Non-Whitelisted**: Lanza error si hay propiedades no permitidas
- **Transform**: Convierte automáticamente tipos (string → number, etc.)
- **Implicit Conversion**: Convierte tipos implícitamente cuando es posible
- **Error Messages**: Ocultos en producción para no exponer información

**Ubicación:** `src/main.ts` - ValidationPipe global

### 5. Logging

Sistema de logging estructurado para monitoreo y debugging.

**Características:**
- Logger nativo de NestJS configurado
- Interceptor de logging HTTP que registra:
  - Método HTTP
  - URL
  - Status code
  - IP del cliente
  - Tiempo de respuesta
  - Errores con detalles

**Niveles de Log:**
- `error`: Errores críticos
- `warn`: Advertencias
- `log`: Información general
- `debug`: Información de debugging
- `verbose`: Información detallada

**Ubicación:**
- Configuración: `src/main.ts`
- Interceptor: `src/common/interceptors/logging.interceptor.ts`

### 6. Autenticación JWT

Sistema de autenticación robusto con JWT y refresh tokens.

**Características:**
- Access tokens con expiración corta (15 minutos por defecto)
- Refresh tokens con expiración larga (7 días por defecto)
- Rotación de refresh tokens en cada uso
- Revocación de tokens al hacer logout
- Revocación de todos los tokens al resetear contraseña

**Ubicación:** `src/auth/`

### 7. Hashing de Passwords

Uso de Argon2 para hashing seguro de contraseñas.

**Características:**
- Algoritmo: Argon2 (resistente a ataques de fuerza bruta)
- Passwords nunca almacenados en texto plano
- Validación de fortaleza en registro/reset

**Ubicación:** `src/auth/auth.service.ts`

### 8. Preparación para 2FA

Estructura preparada para autenticación de dos factores (no implementado en MVP).

**Campos en BD:**
- `twoFactorEnabled`: Boolean
- `twoFactorSecret`: String (nullable)

**Ubicación:** `prisma/schema.prisma` - Modelo User

## 📝 Variables de Entorno de Seguridad

```env
# JWT Secrets (¡CAMBIAR EN PRODUCCIÓN!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key-change-in-production"

# Rate Limiting
THROTTLE_TTL=60000        # Tiempo en ms (1 minuto)
THROTTLE_LIMIT=10         # Número de requests permitidas

# CORS
CORS_ORIGIN="http://localhost:5173"  # Múltiples orígenes separados por coma

# Environment
NODE_ENV="development"    # development | production
```

## 🚨 Recomendaciones de Seguridad para Producción

1. **Secrets**: Cambiar todos los secrets (JWT, refresh tokens) por valores seguros y únicos
2. **HTTPS**: Usar siempre HTTPS en producción
3. **Environment**: Configurar `NODE_ENV=production`
4. **CORS**: Limitar a dominios específicos de producción
5. **Rate Limiting**: Ajustar límites según necesidades
6. **Logging**: Configurar logging centralizado (Sentry, Datadog, etc.)
7. **Monitoring**: Implementar monitoreo de seguridad
8. **Backup**: Configurar backups regulares de la base de datos
9. **Updates**: Mantener dependencias actualizadas
10. **Secrets Management**: Usar un gestor de secretos (AWS Secrets Manager, HashiCorp Vault, etc.)

## 🔍 Verificación de Seguridad

Para verificar que las medidas están activas:

```bash
# Verificar headers de seguridad
curl -I http://localhost:3000/api/health

# Verificar rate limiting (hacer 11 requests rápidas)
for i in {1..11}; do curl http://localhost:3000/api/health; done

# Verificar CORS
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login
```

## 📚 Referencias

- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet Documentation](https://helmetjs.github.io/)
- [Argon2 Documentation](https://github.com/ranisalt/node-argon2)


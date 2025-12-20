# Documentación de API - Trading OS

## Base URL

```
http://localhost:3000/api
```

## Swagger/OpenAPI

La documentación interactiva de la API está disponible en:

```
http://localhost:3000/api/docs
```

**Nota**: Swagger solo está disponible en modo desarrollo (`NODE_ENV !== 'production'`).

## Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT Bearer Token.

### Obtener Token

1. Registrarse: `POST /auth/register`
2. O Iniciar sesión: `POST /auth/login`

Ambos endpoints retornan:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "emailVerified": false
  }
}
```

### Usar Token

Incluir el token en el header `Authorization`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refrescar Token

Cuando el access token expire (15 minutos por defecto), usar:

```
POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Endpoints

### Autenticación

#### `POST /auth/register`
Registrar nuevo usuario.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "Password123!@#"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "emailVerified": false
  }
}
```

**Errores:**
- `409 Conflict`: Email ya registrado
- `400 Bad Request`: Datos inválidos

**Rate Limit:** 3 requests por minuto

---

#### `POST /auth/login`
Iniciar sesión.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "Password123!@#"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "emailVerified": false
  }
}
```

**Errores:**
- `401 Unauthorized`: Credenciales inválidas

**Rate Limit:** 5 requests por minuto

---

#### `POST /auth/refresh`
Renovar access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "emailVerified": false
  }
}
```

**Errores:**
- `401 Unauthorized`: Refresh token inválido o expirado

---

#### `POST /auth/logout`
Cerrar sesión (requiere autenticación).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

#### `POST /auth/forgot-password`
Solicitar reset de contraseña.

**Request:**
```json
{
  "email": "usuario@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

**Nota**: Por seguridad, siempre retorna éxito incluso si el email no existe.

**Rate Limit:** 3 requests por minuto

---

#### `POST /auth/reset-password`
Resetear contraseña con token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewPassword123!@#"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

**Errores:**
- `401 Unauthorized`: Token inválido o expirado
- `400 Bad Request`: Password inválido

---

### Usuarios

#### `GET /users/me`
Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "emailVerified": false,
  "settings": {
    "id": "uuid",
    "userId": "uuid",
    "timezone": "America/Bogota",
    "baseCurrency": "USD",
    "defaultRiskPercent": 1.0,
    "onboardingCompleted": true
  }
}
```

---

#### `PATCH /users/me/settings`
Actualizar configuración del usuario.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "timezone": "America/New_York",
  "baseCurrency": "COP",
  "defaultRiskPercent": 2.0,
  "onboardingCompleted": true
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "timezone": "America/New_York",
  "baseCurrency": "COP",
  "defaultRiskPercent": 2.0,
  "onboardingCompleted": true
}
```

**Campos opcionales:** Todos los campos son opcionales, solo envía los que quieres actualizar.

---

### Cuentas

#### `POST /accounts`
Crear nueva cuenta.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Binance Futures",
  "broker": "Binance",
  "type": "FUTURES",
  "currency": "USD"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Binance Futures",
  "broker": "Binance",
  "type": "FUTURES",
  "currency": "USD",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Tipos válidos:** `SPOT`, `MARGIN`, `FUTURES`, `CFD`

---

#### `GET /accounts`
Listar cuentas del usuario.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Binance Futures",
    "broker": "Binance",
    "type": "FUTURES",
    "currency": "USD",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos inválidos o mal formateados
- `401 Unauthorized`: No autenticado o token inválido
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: email duplicado)
- `429 Too Many Requests`: Rate limit excedido
- `500 Internal Server Error`: Error del servidor

## Rate Limiting

Algunos endpoints tienen rate limiting:

- `/auth/register`: 3 requests por minuto
- `/auth/login`: 5 requests por minuto
- `/auth/forgot-password`: 3 requests por minuto
- Otros endpoints: 10 requests por minuto (default)

Cuando se excede el límite, se retorna `429 Too Many Requests`.

## Validación de Datos

### Email
- Formato válido de email
- Ejemplo: `usuario@example.com`

### Password
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un símbolo (`@$!%*?&`)

### Ejemplos de Errores de Validación

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## Ejemplos con cURL

### Registro
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Obtener Perfil
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

## Más Información

Para documentación interactiva completa, visita:
- Swagger UI: `http://localhost:3000/api/docs` (solo en desarrollo)


# Guía de Testing - Backend Trading OS

## Estructura de Tests

El proyecto incluye dos tipos de tests:

1. **Tests Unitarios** (`*.spec.ts`): Prueban componentes individuales en aislamiento
2. **Tests E2E** (`*.e2e-spec.ts`): Prueban endpoints completos con base de datos real

## Ejecutar Tests

### Todos los tests
```bash
npm run test
```

### Tests unitarios
```bash
npm run test
```

### Tests E2E
```bash
npm run test:e2e
```

### Tests en modo watch
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:cov
```

## Tests Implementados

### Tests Unitarios

#### AuthService (`src/auth/auth.service.spec.ts`)
- ✅ `register`: crear usuario correctamente
- ✅ `register`: rechazar email duplicado
- ✅ `login`: validar credenciales correctas
- ✅ `login`: rechazar credenciales incorrectas
- ✅ `refreshToken`: rotar tokens correctamente
- ✅ `refreshToken`: rechazar token inválido/expirado
- ✅ `logout`: revocar refresh token
- ✅ `forgotPassword`: generar token de reset
- ✅ `resetPassword`: resetear contraseña correctamente

#### UsersService (`src/users/users.service.spec.ts`)
- ✅ `findByEmail`: encontrar usuario por email
- ✅ `findById`: encontrar usuario por ID
- ✅ `findById`: lanzar NotFoundException si no existe
- ✅ `updateSettings`: actualizar settings existentes
- ✅ `updateSettings`: crear settings si no existen

### Tests E2E

#### Auth Endpoints (`test/auth.e2e-spec.ts`)
- ✅ `POST /auth/register`: registro exitoso
- ✅ `POST /auth/register`: rechazar email duplicado
- ✅ `POST /auth/register`: validar formato de email
- ✅ `POST /auth/register`: validar fortaleza de password
- ✅ `POST /auth/login`: login exitoso
- ✅ `POST /auth/login`: rechazar credenciales incorrectas
- ✅ `POST /auth/refresh`: refrescar token
- ✅ `POST /auth/refresh`: rechazar token inválido
- ✅ `POST /auth/logout`: logout exitoso
- ✅ `POST /auth/logout`: requerir autenticación
- ✅ `POST /auth/forgot-password`: solicitar reset
- ✅ `POST /auth/reset-password`: resetear contraseña
- ✅ `POST /auth/reset-password`: rechazar token inválido

### Tests de Validación

#### DTOs (`test/dto-validation.spec.ts`)
- ✅ `RegisterDto`: validar email y password
- ✅ `LoginDto`: validar formato
- ✅ `RefreshTokenDto`: validar token requerido
- ✅ `ForgotPasswordDto`: validar email
- ✅ `ResetPasswordDto`: validar token y password
- ✅ `UpdateSettingsDto`: validar currency enum y rangos

## Configuración

### Jest

Los tests usan Jest con las siguientes configuraciones:

- **Unitarios**: `package.json` → `jest`
- **E2E**: `test/jest-e2e.json`

### Base de Datos para Tests E2E

Los tests E2E usan la misma base de datos configurada en `.env`. 

**⚠️ IMPORTANTE**: Los tests E2E pueden modificar datos. Asegúrate de:
1. Usar una base de datos de testing separada, o
2. Ejecutar tests en un entorno de desarrollo donde los datos pueden ser modificados

### Mocks

Los tests unitarios usan mocks para:
- `PrismaService`: Base de datos
- `JwtService`: Generación de tokens
- `ConfigService`: Variables de entorno
- `argon2`: Hashing de passwords

## Mejores Prácticas

1. **Aislamiento**: Cada test debe ser independiente
2. **Limpieza**: Limpiar mocks entre tests (`jest.clearAllMocks()`)
3. **Nombres descriptivos**: Usar nombres que describan qué se está probando
4. **Arrange-Act-Assert**: Seguir el patrón AAA
5. **Cobertura**: Mantener cobertura alta (>80%)

## Ejemplo de Test Unitario

```typescript
describe('AuthService', () => {
  it('debería crear un usuario correctamente', async () => {
    // Arrange
    const registerDto = { email: 'test@example.com', password: 'Test123!@#' };
    
    // Act
    const result = await service.register(registerDto);
    
    // Assert
    expect(result).toHaveProperty('accessToken');
  });
});
```

## Ejemplo de Test E2E

```typescript
describe('POST /auth/register', () => {
  it('debería registrar un nuevo usuario', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!@#' })
      .expect(201);
    
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

## Troubleshooting

### Error: Cannot find module
Asegúrate de que todas las dependencias estén instaladas:
```bash
npm install
```

### Error: Database connection
Verifica que la base de datos esté corriendo:
```bash
docker-compose up -d
```

### Tests lentos
Los tests E2E son más lentos porque usan la base de datos real. Considera usar una base de datos en memoria o mocks para tests unitarios.


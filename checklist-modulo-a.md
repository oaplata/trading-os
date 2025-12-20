# Checklist Módulo A — Autenticación y Configuración Inicial

## 📋 Resumen del Módulo

**Objetivo:** Permitir a los usuarios registrarse, autenticarse y configurar su cuenta inicial con defaults para acelerar el registro de trades.

**Pantallas:**

1. Login / Register
2. Onboarding (wizard)

**Stack relevante:**

- Backend: NestJS + PostgreSQL + Prisma + JWT + Refresh Tokens
- Frontend: Vue 3 + TypeScript + Tailwind CSS + shadcn-vue
- UI: Tema oscuro por defecto, diseño minimalista tipo terminal

---

## 🔧 Backend

### 1. Setup inicial del proyecto

- [x] Inicializar proyecto NestJS con TypeScript
- [x] Configurar estructura de carpetas modular (auth, accounts, users, etc.)
- [x] Configurar Prisma ORM con PostgreSQL
- [x] Configurar variables de entorno (.env.example y .env)
- [x] Configurar Docker Compose para desarrollo (PostgreSQL + Redis)
- [x] Configurar scripts de package.json (dev, build, migrate, seed)

### 2. Base de datos — Schema Prisma

#### 2.1 Modelo User

- [x] Crear modelo `User` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `email` (unique, indexed)
  - [x] `passwordHash` (string, no se expone en queries)
  - [x] `emailVerified` (boolean, default false)
  - [x] `twoFactorEnabled` (boolean, default false)
  - [x] `twoFactorSecret` (string, nullable, para preparar 2FA)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)
  - [x] `deletedAt` (DateTime, nullable, soft delete)

#### 2.2 Modelo UserSettings (configuración del usuario)

- [x] Crear modelo `UserSettings` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User, unique)
  - [x] `timezone` (string, default: "America/Bogota")
  - [x] `baseCurrency` (enum: COP, USD, default: USD)
  - [x] `defaultRiskPercent` (decimal, nullable, ej: 1.0 para 1%)
  - [x] `onboardingCompleted` (boolean, default false)
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 2.3 Modelo RefreshToken (para rotación de tokens)

- [x] Crear modelo `RefreshToken` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User)
  - [x] `token` (string, unique, indexed)
  - [x] `expiresAt` (DateTime)
  - [x] `revoked` (boolean, default false)
  - [x] `createdAt` (DateTime)
  - [x] `ipAddress` (string, nullable, para auditoría)
  - [x] `userAgent` (string, nullable, para auditoría)

#### 2.4 Modelo PasswordResetToken (recuperación de contraseña)

- [x] Crear modelo `PasswordResetToken` con campos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User)
  - [x] `token` (string, unique, indexed)
  - [x] `expiresAt` (DateTime)
  - [x] `used` (boolean, default false)
  - [x] `createdAt` (DateTime)

#### 2.5 Relaciones Prisma

- [x] Configurar relación `User` → `UserSettings` (one-to-one)
- [x] Configurar relación `User` → `RefreshToken` (one-to-many)
- [x] Configurar relación `User` → `PasswordResetToken` (one-to-many)
- [x] Configurar `onDelete: Cascade` donde corresponda

#### 2.6 Migraciones

- [ ] Crear migración inicial (ejecutar: `npm run prisma:migrate`)
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar índices y constraints

### 3. Módulo Auth (NestJS)

#### 3.1 DTOs (Data Transfer Objects)

- [x] Crear `RegisterDto`:
  - [x] `email` (string, validación de email)
  - [x] `password` (string, min 8 caracteres, validación de fortaleza)
- [x] Crear `LoginDto`:
  - [x] `email` (string)
  - [x] `password` (string)
- [x] Crear `RefreshTokenDto`:
  - [x] `refreshToken` (string)
- [x] Crear `ForgotPasswordDto`:
  - [x] `email` (string)
- [x] Crear `ResetPasswordDto`:
  - [x] `token` (string)
  - [x] `password` (string, min 8 caracteres)
- [x] Crear `AuthResponseDto`:
  - [x] `accessToken` (string)
  - [x] `refreshToken` (string)
  - [x] `user` (objeto con id, email, emailVerified)

#### 3.2 Servicios

- [x] Crear `AuthService` con métodos:
  - [x] `register(registerDto: RegisterDto)` → crea usuario, hashea password, crea UserSettings defaults
  - [x] `login(loginDto: LoginDto)` → valida credenciales, genera tokens
  - [x] `refreshToken(refreshToken: string)` → valida y rota tokens
  - [x] `logout(userId: string, refreshToken: string)` → revoca refresh token
  - [x] `forgotPassword(email: string)` → genera token y envía email (preparar, MVP puede ser log)
  - [x] `resetPassword(token: string, newPassword: string)` → valida token y actualiza password
  - [x] `validateUser(email: string, password: string)` → helper para validación
  - [x] `generateTokens(userId: string)` → genera access + refresh tokens

#### 3.3 JWT Strategy

- [x] Configurar `JwtModule` con secret y expiración
- [x] Crear `JwtStrategy` para validar access tokens
- [x] Crear `JwtAuthGuard` para proteger rutas
- [x] Configurar `JWT_SECRET` y `JWT_EXPIRATION` en .env
- [x] Configurar `REFRESH_TOKEN_SECRET` y `REFRESH_TOKEN_EXPIRATION` en .env

#### 3.4 Password Hashing

- [x] Instalar y configurar `bcrypt` o `argon2`
- [x] Implementar hash de passwords en registro
- [x] Implementar comparación de passwords en login

#### 3.5 Controladores (Endpoints REST)

- [x] `POST /auth/register` → registro de usuario
  - [x] Validar email único
  - [x] Validar fortaleza de password
  - [x] Crear usuario y UserSettings con defaults
  - [x] Retornar tokens y datos del usuario
- [x] `POST /auth/login` → login
  - [x] Validar credenciales
  - [x] Generar tokens
  - [x] Registrar refresh token en BD
  - [x] Retornar tokens y datos del usuario
- [x] `POST /auth/refresh` → renovar access token
  - [x] Validar refresh token
  - [x] Rotar refresh token (revocar viejo, crear nuevo)
  - [x] Retornar nuevos tokens
- [x] `POST /auth/logout` → logout (protegido)
  - [x] Revocar refresh token
  - [x] Retornar éxito
- [x] `POST /auth/forgot-password` → solicitar reset
  - [x] Validar email existe
  - [x] Generar token de reset
  - [x] Guardar en BD con expiración (ej: 1 hora)
  - [x] Enviar email (MVP: log, preparar integración)
- [x] `POST /auth/reset-password` → resetear contraseña
  - [x] Validar token válido y no usado
  - [x] Actualizar password
  - [x] Marcar token como usado
  - [x] Revocar todos los refresh tokens del usuario (seguridad)

#### 3.6 Validaciones y manejo de errores

- [x] Validar formato de email (class-validator)
- [x] Validar fortaleza de password (min 8, mayúscula, número, símbolo)
- [x] Manejar errores: email duplicado, credenciales inválidas, token expirado
- [x] Retornar códigos HTTP apropiados (400, 401, 404, 409)
- [x] Mensajes de error claros y seguros (no exponer info sensible)

### 4. Módulo Users (NestJS)

#### 4.1 Servicios

- [x] Crear `UsersService` con métodos:
  - [x] `findByEmail(email: string)` → buscar usuario por email
  - [x] `findById(id: string)` → buscar usuario por ID
  - [x] `create(userData)` → crear usuario (usado por AuthService)
  - [x] `updateSettings(userId: string, settings: Partial<UserSettings>)` → actualizar configuración

#### 4.2 Controladores

- [x] `GET /users/me` → obtener perfil del usuario autenticado (protegido)
  - [x] Retornar usuario con settings
- [x] `PATCH /users/me/settings` → actualizar settings (protegido)
  - [x] Validar datos (timezone válido, currency válida, etc.)
  - [x] Actualizar UserSettings

### 5. Módulo Accounts (preparación para onboarding)

#### 5.1 Modelo Account (preparar para Módulo B, pero necesario en onboarding)

- [x] Crear modelo `Account` con campos mínimos:
  - [x] `id` (UUID, primary key)
  - [x] `userId` (UUID, foreign key a User)
  - [x] `name` (string, ej: "Binance Futures")
  - [x] `broker` (string, nullable)
  - [x] `type` (enum: Spot, Margin, Futures, CFD, default: Spot)
  - [x] `currency` (string, ej: "USD")
  - [x] `createdAt` (DateTime)
  - [x] `updatedAt` (DateTime)

#### 5.2 Servicios y controladores (mínimos para onboarding)

- [x] `POST /accounts` → crear cuenta (protegido)
  - [x] Validar datos mínimos
  - [x] Crear cuenta asociada al usuario
  - [x] Retornar cuenta creada

### 6. Configuración y seguridad

- [x] Configurar CORS apropiadamente
- [x] Configurar rate limiting (ej: 5 intentos de login por minuto)
- [x] Configurar helmet para headers de seguridad
- [x] Validar y sanitizar inputs (class-validator, class-transformer)
- [x] Configurar logging (Winston o similar)
- [x] Preparar estructura para 2FA (campos en BD, pero no implementar lógica aún)

---

## 🎨 Frontend

### 7. Setup inicial del proyecto

- [x] Inicializar proyecto Vue 3 con TypeScript
- [x] Configurar Vite como build tool
- [x] Configurar Tailwind CSS
- [x] Instalar y configurar shadcn-vue (o Headless UI)
- [x] Configurar estructura de carpetas (components, views, composables, stores, types)
- [x] Configurar router (Vue Router)
- [x] Configurar store (Pinia recomendado)
- [x] Configurar cliente HTTP (axios o fetch wrapper)
- [x] Configurar variables de entorno (.env.example y .env)

### 8. Sistema de diseño y tema

#### 8.1 Configuración de tema oscuro

- [x] Configurar Tailwind con tema oscuro por defecto
- [x] Definir paleta de colores:
  - [x] Fondos: negros/grises profundos
  - [x] Verde para ganancias
  - [x] Rojo para pérdidas
  - [x] Amarillo para BE/neutral
  - [x] Azul para info
- [x] Configurar tipografía: Inter / SF Pro / system font
- [x] Configurar fuente monoespaciada para números en tablas
- [x] Crear variables CSS para colores semánticos

#### 8.2 Componentes base (shadcn-vue o custom)

- [x] Crear componente `Button` (variantes: primary, secondary, danger, ghost)
- [x] Crear componente `Input` (con validación visual)
- [x] Crear componente `Label`
- [x] Crear componente `Card` (contenedores)
- [x] Crear componente `Alert` (mensajes de error/éxito)
- [x] Crear componente `LoadingSpinner`
- [ ] Crear layout base (header, sidebar si aplica, footer)

### 9. Autenticación — Store y lógica

#### 9.1 Store de autenticación (Pinia)

- [x] Crear store `useAuthStore` con:
  - [x] Estado: `user`, `accessToken`, `refreshToken`, `isAuthenticated`
  - [x] Acciones:
    - [x] `register(email, password)` → llamar API, guardar tokens
    - [x] `login(email, password)` → llamar API, guardar tokens
    - [x] `logout()` → limpiar tokens y estado
    - [x] `refreshAccessToken()` → renovar token automáticamente
    - [x] `forgotPassword(email)` → llamar API
    - [x] `resetPassword(token, password)` → llamar API
  - [x] Getters: `isAuthenticated`, `userEmail`, etc.
  - [x] Persistencia: guardar tokens en localStorage (o httpOnly cookies si prefieres)

#### 9.2 Interceptor HTTP

- [x] Configurar interceptor para agregar `Authorization: Bearer <token>` a requests
- [x] Configurar interceptor de respuesta para:
  - [x] Manejar 401 → intentar refresh token
  - [x] Si refresh falla → logout y redirigir a login
  - [x] Manejar errores comunes (400, 404, 500)

### 10. Pantalla: Login / Register

#### 10.1 Vista de Login

- [x] Crear componente `LoginView.vue`
- [x] Formulario con campos:
  - [x] Email (input con validación)
  - [x] Password (input tipo password con toggle mostrar/ocultar)
  - [x] Checkbox "Recordarme" (opcional)
  - [x] Link "¿Olvidaste tu contraseña?"
- [x] Botón "Iniciar sesión" (deshabilitado mientras carga)
- [x] Link a "Registrarse" si no tienes cuenta
- [x] Manejo de errores (mostrar mensajes claros)
- [x] Loading state durante autenticación
- [x] Redirección a dashboard después de login exitoso

#### 10.2 Vista de Register

- [x] Crear componente `RegisterView.vue`
- [x] Formulario con campos:
  - [x] Email (input con validación en tiempo real)
  - [x] Password (input con indicador de fortaleza)
  - [x] Confirm Password (validación de coincidencia)
- [x] Mostrar requisitos de password (min 8, mayúscula, número, símbolo)
- [x] Botón "Registrarse" (deshabilitado si formulario inválido)
- [x] Link a "Iniciar sesión" si ya tienes cuenta
- [x] Manejo de errores (email duplicado, etc.)
- [x] Loading state
- [x] Redirección a onboarding después de registro exitoso

#### 10.3 Vista de Forgot Password

- [x] Crear componente `ForgotPasswordView.vue`
- [x] Formulario con campo:
  - [x] Email
- [x] Botón "Enviar enlace de recuperación"
- [x] Mensaje de confirmación después de enviar
- [x] Link de vuelta a login

#### 10.4 Vista de Reset Password

- [x] Crear componente `ResetPasswordView.vue`
- [x] Obtener token de query params
- [x] Formulario con campos:
  - [x] New Password (con indicador de fortaleza)
  - [x] Confirm Password
- [x] Botón "Resetear contraseña"
- [x] Manejo de errores (token inválido/expirado)
- [x] Redirección a login después de reset exitoso

#### 10.5 Validaciones del formulario

- [x] Validar email con regex
- [x] Validar password con reglas de fortaleza
- [x] Validar confirmación de password
- [x] Mostrar mensajes de error inline
- [x] Deshabilitar submit si hay errores

### 11. Pantalla: Onboarding (Wizard)

#### 11.1 Componente Wizard base

- [x] Crear componente `OnboardingWizard.vue`
- [x] Implementar navegación por pasos (stepper)
- [x] Indicador visual de progreso (paso 1 de 4, etc.)
- [x] Botones "Anterior" y "Siguiente"
- [x] Validación por paso antes de avanzar

#### 11.2 Paso 1: Zona horaria

- [x] Campo select/dropdown con zonas horarias
- [x] Default: "America/Bogota"
- [ ] Búsqueda/filtro de zonas horarias (mejora futura)
- [ ] Mostrar hora actual de ejemplo con la zona seleccionada (mejora futura)

#### 11.3 Paso 2: Moneda base

- [x] Radio buttons o select con opciones: COP, USD
- [x] Default: USD
- [x] Mostrar símbolo de moneda ($, COP)
- [x] Descripción breve de qué significa

#### 11.4 Paso 3: Crear primera cuenta

- [x] Formulario con campos:
  - [x] Nombre de la cuenta (input, ej: "Binance Futures")
  - [x] Broker/Exchange (input opcional)
  - [x] Tipo (select: Spot, Margin, Futures, CFD)
  - [x] Moneda (select, default: la moneda base seleccionada)
- [x] Validación: nombre requerido
- [x] Opción "Saltar este paso" (opcional, puede crear cuenta después)

#### 11.5 Paso 4: Riesgo por defecto

- [x] Campo numérico para riesgo %
- [x] Default: 1%
- [x] Slider o input numérico (0.1% - 10%)
- [x] Descripción: "Este será el riesgo por defecto al crear nuevos trades"
- [x] Opción "No usar riesgo por defecto" (checkbox)

#### 11.6 Finalización del onboarding

- [x] Botón "Completar configuración"
- [x] Llamar API para:
  - [x] Actualizar UserSettings (timezone, baseCurrency, defaultRiskPercent)
  - [x] Crear cuenta si se completó el paso 3
  - [x] Marcar onboardingCompleted = true
- [x] Loading state
- [x] Redirección a dashboard después de completar

#### 11.7 Store para onboarding

- [x] Crear store `useOnboardingStore` o usar `useAuthStore`
- [ ] Guardar estado temporal del wizard (si el usuario recarga) (mejora futura)
- [ ] O persistir en localStorage temporalmente (mejora futura)

### 12. Rutas y guards

#### 12.1 Configuración de rutas

- [x] Ruta `/login` → LoginView
- [x] Ruta `/register` → RegisterView
- [x] Ruta `/forgot-password` → ForgotPasswordView
- [x] Ruta `/reset-password` → ResetPasswordView (con query param token)
- [x] Ruta `/onboarding` → OnboardingWizard
- [x] Ruta `/dashboard` → DashboardView (placeholder por ahora)

#### 12.2 Route guards

- [x] Crear guard `authGuard`:
  - [x] Verificar si usuario está autenticado
  - [x] Si no → redirigir a `/login`
  - [x] Si sí → permitir acceso
- [x] Crear guard `guestGuard`:
  - [x] Si usuario está autenticado → redirigir a `/dashboard`
  - [x] Si no → permitir acceso (para login/register)
- [x] Crear guard `onboardingGuard`:
  - [x] Si usuario autenticado pero onboarding no completado → redirigir a `/onboarding`
  - [x] Si onboarding completado → redirigir a `/dashboard`
- [x] Aplicar guards a rutas apropiadas

### 13. Manejo de estado y persistencia

- [x] Configurar persistencia de tokens (localStorage o httpOnly cookies)
- [x] Restaurar sesión al recargar página (verificar token válido)
- [x] Manejar expiración de tokens (refresh automático)
- [x] Limpiar estado al hacer logout

### 14. UX y feedback visual

- [x] Mostrar loading states en todas las acciones asíncronas
- [x] Mostrar mensajes de éxito/error con toasts o alerts
- [x] Validación en tiempo real en formularios
- [x] Deshabilitar botones durante operaciones
- [ ] Transiciones suaves entre vistas (mejora futura)
- [x] Manejo de errores de red (mostrar mensaje amigable)

---

## 🧪 Testing

### 15. Tests backend

- [x] Tests unitarios para `AuthService`:
  - [x] register: crear usuario correctamente
  - [x] register: rechazar email duplicado
  - [x] login: validar credenciales correctas
  - [x] login: rechazar credenciales incorrectas
  - [x] refreshToken: rotar tokens correctamente
  - [x] refreshToken: rechazar token inválido/expirado
- [x] Tests unitarios para `UsersService`
- [x] Tests de integración para endpoints:
  - [x] POST /auth/register
  - [x] POST /auth/login
  - [x] POST /auth/refresh
  - [x] POST /auth/logout
  - [x] POST /auth/forgot-password
  - [x] POST /auth/reset-password
- [x] Tests de validación de DTOs

### 16. Tests frontend

- [x] Tests unitarios para componentes:
  - [x] LoginView (validación de formulario)
  - [x] RegisterView (validación de formulario)
  - [x] OnboardingWizard (navegación entre pasos)
- [x] Tests para store de autenticación
- [x] Tests E2E básicos (opcional, con Playwright o Cypress):
  - [x] Flujo completo de registro → onboarding → login

---

## 📝 Documentación

### 17. Documentación técnica

- [x] Documentar endpoints de API (Swagger/OpenAPI recomendado)
- [x] Documentar estructura de base de datos
- [x] Documentar variables de entorno necesarias
- [x] README con instrucciones de setup y desarrollo

---

## ✅ Criterios de aceptación

### Funcionalidad

- [ ] Usuario puede registrarse con email y password
- [ ] Usuario puede iniciar sesión
- [ ] Usuario puede recuperar contraseña (flujo completo)
- [ ] Tokens se renuevan automáticamente
- [ ] Usuario puede completar onboarding y configurar defaults
- [ ] Usuario puede crear su primera cuenta en onboarding
- [ ] Rutas protegidas redirigen a login si no autenticado
- [ ] Usuario autenticado sin onboarding completado es redirigido a onboarding

### Seguridad

- [ ] Passwords están hasheados (nunca en texto plano)
- [ ] Tokens tienen expiración apropiada
- [ ] Refresh tokens se rotan correctamente
- [ ] Rate limiting en endpoints de autenticación
- [ ] Validación de inputs en backend y frontend
- [ ] No se exponen mensajes de error que revelen información sensible

### UI/UX

- [ ] Tema oscuro aplicado correctamente
- [ ] Formularios tienen validación visual clara
- [ ] Mensajes de error son claros y útiles
- [ ] Loading states en todas las operaciones asíncronas
- [ ] Onboarding es intuitivo y guía al usuario
- [ ] Diseño es consistente y profesional

---

## 🚀 Próximos pasos (después del Módulo A)

Una vez completado el Módulo A, se puede proceder con:

- Módulo B: Cuentas, capital y cashflows
- Módulo C: Catálogo de instrumentos
- Módulo D: Estrategias, setups y reglas

---

**Notas:**

- El 2FA está preparado en el schema pero no se implementa en MVP
- El envío de emails para recuperación de contraseña puede ser un log en MVP, pero la estructura debe estar lista
- El onboarding puede ser opcional (usuario puede saltar pasos), pero se recomienda guiarlo

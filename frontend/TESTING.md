# Guía de Testing - Frontend Trading OS

## Estructura de Tests

El proyecto incluye tres tipos de tests:

1. **Tests Unitarios de Componentes**: Prueban componentes Vue individuales
2. **Tests Unitarios de Stores**: Prueban la lógica de Pinia stores
3. **Tests E2E**: Prueban flujos completos con Playwright

## Ejecutar Tests

### Todos los tests unitarios
```bash
npm run test
```

### Tests en modo watch
```bash
npm run test
# Presiona 'w' para modo watch
```

### Tests con UI
```bash
npm run test:ui
```

### Coverage
```bash
npm run test:coverage
```

### Tests E2E
```bash
npm run test:e2e
```

## Tests Implementados

### Tests Unitarios de Componentes

#### LoginView (`src/views/__tests__/LoginView.spec.ts`)
- ✅ Renderizar formulario de login
- ✅ Validar email vacío
- ✅ Validar contraseña vacía
- ✅ Llamar a login cuando el formulario es válido
- ✅ Mostrar error si el login falla
- ✅ Mostrar estado de carga durante el login

#### RegisterView (`src/views/__tests__/RegisterView.spec.ts`)
- ✅ Renderizar formulario de registro
- ✅ Validar que las contraseñas coincidan
- ✅ Validar fortaleza de contraseña
- ✅ Validar mayúscula, número y símbolo
- ✅ Llamar a register cuando el formulario es válido
- ✅ Mostrar error si el email ya está registrado

#### OnboardingWizard (`src/views/__tests__/OnboardingWizard.spec.ts`)
- ✅ Renderizar wizard con el primer paso
- ✅ Mostrar stepper con 4 pasos
- ✅ Navegar al siguiente paso
- ✅ Navegar al paso anterior
- ✅ Mostrar todos los pasos del wizard
- ✅ Completar onboarding y llamar a las APIs
- ✅ Tener valores por defecto correctos

### Tests Unitarios de Stores

#### AuthStore (`src/stores/__tests__/auth.spec.ts`)
- ✅ Inicializar desde localStorage
- ✅ Manejar localStorage vacío
- ✅ Register: registrar usuario y guardar tokens
- ✅ Login: hacer login y guardar tokens
- ✅ Logout: limpiar tokens y estado
- ✅ RefreshAccessToken: refrescar access token
- ✅ RefreshAccessToken: hacer logout si falla
- ✅ ForgotPassword: llamar al endpoint
- ✅ ResetPassword: llamar al endpoint
- ✅ FetchUser: obtener y actualizar usuario
- ✅ UpdateSettings: actualizar settings
- ✅ Computed properties: isAuthenticated, userEmail

### Tests E2E

#### Auth Flow (`test/e2e/auth-flow.spec.ts`)
- ✅ Flujo completo: registro → onboarding → login
- ✅ Mostrar errores de validación
- ✅ Validar que las contraseñas coincidan

## Configuración

### Vitest

Los tests unitarios usan Vitest con:
- **Environment**: `happy-dom` (más rápido que jsdom)
- **Setup**: `test/setup.ts` para configuración global
- **Coverage**: v8 provider

### Playwright

Los tests E2E usan Playwright con:
- **Browser**: Chromium
- **Base URL**: `http://localhost:5173`
- **Web Server**: Inicia automáticamente el servidor de desarrollo

## Mocks

Los tests usan mocks para:
- `@/stores/auth`: Store de autenticación
- `@/services/api`: Cliente HTTP

## Mejores Prácticas

1. **Aislamiento**: Cada test debe ser independiente
2. **Limpieza**: Limpiar localStorage y mocks entre tests
3. **Nombres descriptivos**: Usar nombres que describan qué se está probando
4. **Arrange-Act-Assert**: Seguir el patrón AAA
5. **Testing Library**: Usar queries accesibles (getByRole, getByLabelText)

## Ejemplo de Test de Componente

```typescript
import { mount } from '@testing-library/vue';
import LoginView from '../LoginView.vue';

it('debería renderizar el formulario', () => {
  const { getByLabelText } = mount(LoginView);
  expect(getByLabelText(/email/i)).toBeInTheDocument();
});
```

## Ejemplo de Test de Store

```typescript
import { useAuthStore } from '../auth';

it('debería hacer login', async () => {
  const store = useAuthStore();
  await store.login('test@example.com', 'password');
  expect(store.isAuthenticated).toBe(true);
});
```

## Ejemplo de Test E2E

```typescript
test('debería hacer login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
});
```

## Troubleshooting

### Error: Cannot find module
Asegúrate de que todas las dependencias estén instaladas:
```bash
npm install
```

### Error: Test environment
Verifica que `vitest.config.ts` tenga `environment: 'happy-dom'` configurado.

### Tests E2E lentos
Los tests E2E son más lentos porque usan un navegador real. Considera usar `--workers=1` para debugging.

### Error: Port already in use
Si el puerto 5173 está en uso, cierra otros procesos o cambia el puerto en `vite.config.ts`.


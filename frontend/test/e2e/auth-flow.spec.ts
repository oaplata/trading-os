import { test, expect } from '@playwright/test';

test.describe('Flujo completo de autenticación', () => {
  test('debería completar el flujo: registro → onboarding → login', async ({
    page,
  }) => {
    // Paso 1: Registro
    await page.goto('/register');

    // Llenar formulario de registro
    await page.fill('input[type="email"]', 'e2e-test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.fill('input[type="password"]:nth-of-type(2)', 'Test123!@#');

    // Hacer clic en registrarse
    await page.click('button:has-text("Registrarse")');

    // Esperar a que se complete el registro y redirija
    await page.waitForURL('/onboarding', { timeout: 5000 });

    // Paso 2: Onboarding
    // Verificar que estamos en el onboarding
    await expect(page.locator('h1:has-text("Configuración Inicial")')).toBeVisible();

    // Paso 1 del onboarding: Zona horaria (ya tiene default)
    await page.click('button:has-text("Siguiente")');

    // Paso 2: Moneda base
    await expect(page.locator('h2:has-text("Moneda Base")')).toBeVisible();
    await page.click('button:has-text("Siguiente")');

    // Paso 3: Crear cuenta (opcional, podemos saltar)
    await expect(page.locator('h2:has-text("Crear Primera Cuenta")')).toBeVisible();
    await page.fill('input[placeholder*="Binance"]', 'Test Account');
    await page.click('button:has-text("Siguiente")');

    // Paso 4: Riesgo por defecto
    await expect(page.locator('h2:has-text("Riesgo por Defecto")')).toBeVisible();
    await page.click('button:has-text("Completar Configuración")');

    // Esperar a que se complete y redirija al dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Verificar que estamos en el dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Paso 3: Logout y Login
    // Hacer logout (si hay un botón de logout)
    // Por ahora, simplemente navegar a login
    await page.goto('/login');

    // Hacer login con las credenciales registradas
    await page.fill('input[type="email"]', 'e2e-test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button:has-text("Iniciar Sesión")');

    // Verificar que se redirige al dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('debería mostrar errores de validación en el formulario de registro', async ({
    page,
  }) => {
    await page.goto('/register');

    // Intentar enviar sin llenar campos
    await page.click('button:has-text("Registrarse")');

    // Verificar que se muestran errores
    await expect(page.locator('text=/email es requerido/i')).toBeVisible();
  });

  test('debería validar que las contraseñas coincidan', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.fill('input[type="password"]:nth-of-type(2)', 'Different123!@#');

    await page.click('button:has-text("Registrarse")');

    await expect(page.locator('text=/contraseñas no coinciden/i')).toBeVisible();
  });
});


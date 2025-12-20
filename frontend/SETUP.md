# Guía de Setup - Frontend Trading OS

## Pasos para configurar el proyecto

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `frontend/` con el siguiente contenido:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:3000/api
```

**Nota:** El prefijo `VITE_` es necesario para que Vite exponga la variable al código del cliente.

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 4. Verificar que funciona

1. Abre `http://localhost:5173` en tu navegador
2. Deberías ver la pantalla de Login
3. Asegúrate de que el backend esté corriendo en `http://localhost:3000`

## Estructura creada

✅ Proyecto Vue 3 con TypeScript
✅ Vite como build tool
✅ Tailwind CSS con tema oscuro por defecto
✅ Vue Router con guards de autenticación
✅ Pinia para state management
✅ Cliente HTTP (Axios) con interceptors
✅ Componentes base de UI (Button, Input, Card, Alert, LoadingSpinner)
✅ Pantallas de autenticación completas
✅ Onboarding wizard (4 pasos)
✅ Sistema de diseño con colores semánticos

## Características del Tema Oscuro

- **Fondos**: Negros/grises profundos (#0a0a0a, #111111, #151515)
- **Colores semánticos**:
  - Verde (#10b981) para ganancias
  - Rojo (#ef4444) para pérdidas
  - Amarillo (#eab308) para BE/neutral
  - Azul (#3b82f6) para info
- **Tipografía**: Inter / SF Pro / system font
- **Números monoespaciados**: Para tablas y datos numéricos

## Componentes UI Disponibles

- `Button` - Botones con variantes (primary, secondary, danger, ghost)
- `Input` - Inputs con validación visual
- `Label` - Etiquetas para formularios
- `Card` - Contenedores con estilo
- `Alert` - Mensajes de error/éxito/info
- `LoadingSpinner` - Indicador de carga

## Rutas Configuradas

- `/login` - Iniciar sesión
- `/register` - Registro de usuario
- `/forgot-password` - Recuperar contraseña
- `/reset-password` - Resetear contraseña (requiere token)
- `/onboarding` - Wizard de configuración inicial
- `/dashboard` - Dashboard principal (placeholder)

## Guards de Rutas

- **authGuard**: Protege rutas que requieren autenticación
- **guestGuard**: Redirige usuarios autenticados
- **onboardingGuard**: Redirige a onboarding si no está completado

## Store de Autenticación

El store `useAuthStore` incluye:
- Estado: `user`, `accessToken`, `refreshToken`, `isAuthenticated`
- Acciones: `register`, `login`, `logout`, `refreshAccessToken`, `forgotPassword`, `resetPassword`
- Persistencia automática en localStorage
- Inicialización desde localStorage al cargar la app

## Cliente HTTP

El cliente HTTP (`src/services/api.ts`) incluye:
- Interceptor para agregar token de autorización
- Interceptor para refrescar token automáticamente en 401
- Logout automático si el refresh falla
- Redirección a login si no está autenticado

## Próximos Pasos

1. Probar el flujo completo de autenticación
2. Completar el dashboard
3. Implementar módulos restantes (trades, reportes, etc.)
4. Agregar gráficos (Apache ECharts)

## Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Previsualizar build

# Calidad de código
npm run lint         # Ejecutar linter
npm run format       # Formatear código
```

## Troubleshooting

### Error: Cannot find module
Ejecuta `npm install` para instalar todas las dependencias.

### Error de CORS
Asegúrate de que:
1. El backend esté corriendo en `http://localhost:3000`
2. La variable `CORS_ORIGIN` en el backend incluya `http://localhost:5173`

### Error: Token expired
El interceptor debería refrescar el token automáticamente. Si persiste, verifica que el backend esté configurado correctamente.


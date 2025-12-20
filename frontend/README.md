# Trading OS Frontend

Frontend del Trading OS - Sistema de journal, portfolio y analytics para trading.

## Stack Tecnológico

- **Vue 3** - Framework JavaScript progresivo
- **TypeScript** - Lenguaje de programación
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework CSS utility-first
- **Vue Router** - Router oficial de Vue
- **Pinia** - State management
- **Axios** - Cliente HTTP

## Setup Inicial

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Instalación

1. Instalar dependencias:
```bash
cd frontend
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env si es necesario
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Estructura del Proyecto

```
src/
├── assets/          # Recursos estáticos (CSS, imágenes)
├── components/      # Componentes Vue reutilizables
│   └── ui/         # Componentes base de UI
├── composables/    # Composables de Vue (lógica reutilizable)
├── router/         # Configuración de rutas
├── services/       # Servicios (API, etc.)
├── stores/         # Stores de Pinia
├── types/          # Definiciones de tipos TypeScript
└── views/          # Vistas/páginas
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Compilar para producción
- `npm run preview` - Previsualizar build de producción
- `npm run lint` - Ejecutar linter
- `npm run format` - Formatear código
- `npm run test` - Ejecutar tests unitarios
- `npm run test:ui` - Ejecutar tests con UI interactiva
- `npm run test:coverage` - Ejecutar tests con coverage
- `npm run test:e2e` - Ejecutar tests E2E con Playwright

## Características Implementadas

✅ Proyecto Vue 3 con TypeScript
✅ Vite como build tool
✅ Tailwind CSS con tema oscuro
✅ Vue Router con guards de autenticación
✅ Pinia para state management
✅ Cliente HTTP con interceptors (refresh token automático)
✅ Componentes base de UI (Button, Input, Card, Alert, LoadingSpinner)
✅ Sistema de diseño con colores semánticos (profit, loss, neutral, info)
✅ Pantallas de autenticación (Login, Register, Forgot/Reset Password)
✅ Onboarding wizard (4 pasos)
✅ Variables de entorno configuradas

## Tema Oscuro

El tema oscuro está configurado por defecto con:
- Fondos: negros/grises profundos
- Verde para ganancias
- Rojo para pérdidas
- Amarillo para BE/neutral
- Azul para info
- Tipografía: Inter / SF Pro / system font
- Números monoespaciados en tablas

## Variables de Entorno

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Testing

El proyecto incluye tests unitarios y E2E:

- **Tests unitarios**: Prueban componentes Vue y stores con Vitest
- **Tests E2E**: Prueban flujos completos con Playwright
- **Coverage**: Reportes de cobertura disponibles

Ver `TESTING.md` para más detalles sobre cómo ejecutar y escribir tests.

## Próximos Pasos

1. Completar el dashboard
2. Implementar módulos restantes (trades, reportes, etc.)
3. Agregar gráficos (Apache ECharts)
4. Implementar importación/exportación CSV


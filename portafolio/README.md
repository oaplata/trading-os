# Portafolio - Panel de Administración

Sistema de gestión de portafolio de acciones basado en datos de TradingView.

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose instalados

### Instalación y Ejecución

1. **Iniciar los servicios**:
```bash
cd portafolio
docker-compose up -d
```

2. **Ejecutar migraciones de base de datos**:
```bash
docker-compose exec backend npm run migrate
```

3. **Importar datos desde JSON**:
```bash
docker-compose exec backend node scripts/importData.js /ruta/al/archivo.json
```

4. **Acceder al panel de administración**:
   - Panel web: http://localhost:3000
   - API: http://localhost:3000/api

## 📁 Estructura del Proyecto

```
portafolio/
├── backend/
│   ├── db/
│   │   ├── index.js          # Conexión a PostgreSQL
│   │   └── schema.sql        # Esquema de base de datos
│   ├── routes/
│   │   ├── sectores.js       # Rutas API para sectores
│   │   ├── industrias.js     # Rutas API para industrias
│   │   └── acciones.js       # Rutas API para acciones
│   ├── scripts/
│   │   ├── migrate.js        # Script de migración
│   │   └── importData.js     # Script de importación
│   ├── public/
│   │   └── index.html        # Panel de administración
│   ├── server.js              # Servidor Express
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🗄️ Modelo de Datos

### Tablas

- **sectores**: Almacena los sectores económicos
- **industrias**: Almacena las industrias (relacionadas con sectores)
- **acciones**: Almacena las acciones (sin duplicados por ticker)
- **industria_accion**: Tabla de relación muchos a muchos entre industrias y acciones

### Relaciones

- Un sector tiene muchas industrias
- Una industria pertenece a un sector
- Una industria tiene muchas acciones (muchos a muchos)
- Una acción puede estar en múltiples industrias

## 🔌 API Endpoints

### Sectores
- `GET /api/sectores` - Listar todos los sectores
- `GET /api/sectores/:id` - Obtener un sector
- `PATCH /api/sectores/:id/activo` - Activar/desactivar sector

### Industrias
- `GET /api/industrias` - Listar todas las industrias
- `GET /api/industrias?Sector_id=1` - Filtrar por sector
- `GET /api/industrias/:id` - Obtener una industria
- `PATCH /api/industrias/:id/activo` - Activar/desactivar industria

### Acciones
- `GET /api/acciones` - Listar todas las acciones
- `GET /api/acciones?industria_id=1` - Filtrar por industria
- `GET /api/acciones?activo=true` - Filtrar por estado
- `GET /api/acciones/:id` - Obtener una acción
- `PATCH /api/acciones/:id/activo` - Activar/desactivar acción

## 🎨 Panel de Administración

El panel web permite:
- Ver todos los sectores, industrias y acciones
- Activar/desactivar cada elemento con un toggle
- Buscar y filtrar elementos
- Ver estadísticas en tiempo real

## 📝 Importar Datos

Para importar datos desde el JSON generado por el scraper:

```bash
# Copiar el archivo JSON al contenedor
docker cp /ruta/local/datos_completos.json portafolio_backend:/app/data.json

# Importar datos
docker-compose exec backend node scripts/importData.js /app/data.json
```

## 🔧 Configuración

Variables de entorno (en `docker-compose.yml`):
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `PORT`: Puerto del servidor (default: 3000)
- `NODE_ENV`: Entorno de ejecución

## 🛠️ Comandos Útiles

```bash
# Ver logs
docker-compose logs -f backend

# Reiniciar servicios
docker-compose restart

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

## 📊 Características

- ✅ Sin duplicados: Las acciones se almacenan una sola vez (por ticker único)
- ✅ Relaciones muchos a muchos: Una acción puede estar en múltiples industrias
- ✅ Activación/desactivación: Control granular de qué elementos están activos
- ✅ Panel web: Interfaz visual para gestión
- ✅ API RESTful: Endpoints para integración


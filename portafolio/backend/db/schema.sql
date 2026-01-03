-- Tabla de sectores
CREATE TABLE IF NOT EXISTS sectores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    capitalizacion_mercado VARCHAR(100),
    url_sector TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nombre)
);

-- Tabla de industrias
CREATE TABLE IF NOT EXISTS industrias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    capitalizacion_mercado VARCHAR(100),
    url_industria TEXT,
    sector_id INTEGER REFERENCES sectores(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nombre, sector_id)
);

-- Tabla de acciones
CREATE TABLE IF NOT EXISTS acciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    ticker VARCHAR(50) NOT NULL UNIQUE,
    image_url TEXT,
    url_accion TEXT,
    capitalizacion_mercado VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación muchos a muchos: industrias <-> acciones
CREATE TABLE IF NOT EXISTS industria_accion (
    id SERIAL PRIMARY KEY,
    industria_id INTEGER REFERENCES industrias(id) ON DELETE CASCADE,
    accion_id INTEGER REFERENCES acciones(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(industria_id, accion_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_industrias_sector_id ON industrias(sector_id);
CREATE INDEX IF NOT EXISTS idx_industria_accion_industria_id ON industria_accion(industria_id);
CREATE INDEX IF NOT EXISTS idx_industria_accion_accion_id ON industria_accion(accion_id);
CREATE INDEX IF NOT EXISTS idx_acciones_ticker ON acciones(ticker);
CREATE INDEX IF NOT EXISTS idx_acciones_activo ON acciones(activo);
CREATE INDEX IF NOT EXISTS idx_sectores_activo ON sectores(activo);
CREATE INDEX IF NOT EXISTS idx_industrias_activo ON industrias(activo);


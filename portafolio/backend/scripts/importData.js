const fs = require('fs');
const path = require('path');
const pool = require('../db/index');

async function importData(jsonFilePath) {
  try {
    console.log('🔄 Iniciando importación de datos...');
    
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const sectores = data.sectores || [];
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Importar sectores
      for (const sector of sectores) {
        const sectorResult = await client.query(
          `INSERT INTO sectores (nombre, capitalizacion_mercado, url_sector, activo)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (nombre) 
           DO UPDATE SET 
             capitalizacion_mercado = EXCLUDED.capitalizacion_mercado,
             url_sector = EXCLUDED.url_sector,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [sector.nombre, sector.capitalizacion_mercado, sector.url_sector]
        );
        
        const sectorId = sectorResult.rows[0].id;
        
        // Importar industrias del sector
        const industrias = sector.industrias || [];
        for (const industria of industrias) {
          const industriaResult = await client.query(
            `INSERT INTO industrias (nombre, capitalizacion_mercado, url_industria, sector_id, activo)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (nombre, sector_id)
             DO UPDATE SET
               capitalizacion_mercado = EXCLUDED.capitalizacion_mercado,
               url_industria = EXCLUDED.url_industria,
               updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [industria.nombre, industria.capitalizacion_mercado, industria.url_industria, sectorId]
          );
          
          const industriaId = industriaResult.rows[0].id;
          
          // Importar acciones de la industria
          const acciones = industria.acciones || [];
          for (const accion of acciones) {
            // Insertar o actualizar acción (por ticker único)
            const accionResult = await client.query(
              `INSERT INTO acciones (nombre, ticker, image_url, url_accion, capitalizacion_mercado, activo)
               VALUES ($1, $2, $3, $4, $5, true)
               ON CONFLICT (ticker)
               DO UPDATE SET
                 nombre = EXCLUDED.nombre,
                 image_url = EXCLUDED.image_url,
                 url_accion = EXCLUDED.url_accion,
                 capitalizacion_mercado = EXCLUDED.capitalizacion_mercado,
                 updated_at = CURRENT_TIMESTAMP
               RETURNING id`,
              [
                accion.nombre,
                accion.ticker,
                accion.image_url,
                accion.url_accion,
                accion.capitalizacion_mercado
              ]
            );
            
            const accionId = accionResult.rows[0].id;
            
            // Crear relación industria-acción (si no existe)
            await client.query(
              `INSERT INTO industria_accion (industria_id, accion_id)
               VALUES ($1, $2)
               ON CONFLICT (industria_id, accion_id) DO NOTHING`,
              [industriaId, accionId]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Datos importados exitosamente');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la importación:', error);
    process.exit(1);
  }
}

// Obtener ruta del archivo JSON desde argumentos
const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error('❌ Por favor proporciona la ruta al archivo JSON');
  console.log('Uso: node scripts/importData.js <ruta_al_json>');
  process.exit(1);
}

importData(jsonFilePath);


const fs = require('fs');
const path = require('path');
const pool = require('../db/index');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrate();


const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// GET /api/industrias - Obtener todas las industrias
router.get('/', async (req, res) => {
  try {
    const { sector_id } = req.query;
    
    let query = `
      SELECT i.*, 
             s.nombre as sector_nombre,
             COUNT(DISTINCT ia.accion_id) as total_acciones
      FROM industrias i
      LEFT JOIN sectores s ON s.id = i.sector_id
      LEFT JOIN industria_accion ia ON ia.industria_id = i.id
    `;
    
    const params = [];
    if (sector_id) {
      query += ' WHERE i.sector_id = $1';
      params.push(sector_id);
    }
    
    query += ' GROUP BY i.id, s.nombre ORDER BY i.nombre';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo industrias:', error);
    res.status(500).json({ error: 'Error al obtener industrias' });
  }
});

// GET /api/industrias/:id - Obtener una industria por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, s.nombre as sector_nombre
       FROM industrias i
       LEFT JOIN sectores s ON s.id = i.sector_id
       WHERE i.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Industria no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo industria:', error);
    res.status(500).json({ error: 'Error al obtener industria' });
  }
});

// PATCH /api/industrias/:id/activo - Activar/desactivar industria
router.patch('/:id/activo', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    const result = await pool.query(
      'UPDATE industrias SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [activo, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Industria no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando industria:', error);
    res.status(500).json({ error: 'Error al actualizar industria' });
  }
});

module.exports = router;


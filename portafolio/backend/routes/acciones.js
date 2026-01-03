const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// GET /api/acciones - Obtener todas las acciones
router.get('/', async (req, res) => {
  try {
    const { industria_id, activo } = req.query;
    
    let query = `
      SELECT DISTINCT a.*,
             COUNT(DISTINCT ia.industria_id) as total_industrias,
             STRING_AGG(DISTINCT i.nombre, ', ') as industrias_nombres
      FROM acciones a
      LEFT JOIN industria_accion ia ON ia.accion_id = a.id
      LEFT JOIN industrias i ON i.id = ia.industria_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;
    
    if (industria_id) {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM industria_accion ia2 
        WHERE ia2.accion_id = a.id AND ia2.industria_id = $${paramCount}
      )`);
      params.push(industria_id);
    }
    
    if (activo !== undefined) {
      paramCount++;
      conditions.push(`a.activo = $${paramCount}`);
      params.push(activo === 'true');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY a.id ORDER BY a.ticker';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo acciones:', error);
    res.status(500).json({ error: 'Error al obtener acciones' });
  }
});

// GET /api/acciones/:id - Obtener una acción por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*,
              STRING_AGG(DISTINCT i.nombre, ', ') as industrias_nombres,
              STRING_AGG(DISTINCT s.nombre, ', ') as sectores_nombres
       FROM acciones a
       LEFT JOIN industria_accion ia ON ia.accion_id = a.id
       LEFT JOIN industrias i ON i.id = ia.industria_id
       LEFT JOIN sectores s ON s.id = i.sector_id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acción no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo acción:', error);
    res.status(500).json({ error: 'Error al obtener acción' });
  }
});

// PATCH /api/acciones/:id/activo - Activar/desactivar acción
router.patch('/:id/activo', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    const result = await pool.query(
      'UPDATE acciones SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [activo, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acción no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando acción:', error);
    res.status(500).json({ error: 'Error al actualizar acción' });
  }
});

module.exports = router;


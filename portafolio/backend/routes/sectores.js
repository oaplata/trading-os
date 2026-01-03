const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// GET /api/sectores - Obtener todos los sectores
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              COUNT(DISTINCT i.id) as total_industrias,
              COUNT(DISTINCT ia.accion_id) as total_acciones
       FROM sectores s
       LEFT JOIN industrias i ON i.sector_id = s.id
       LEFT JOIN industria_accion ia ON ia.industria_id = i.id
       GROUP BY s.id
       ORDER BY s.nombre`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo sectores:', error);
    res.status(500).json({ error: 'Error al obtener sectores' });
  }
});

// GET /api/sectores/:id - Obtener un sector por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM sectores WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sector no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo sector:', error);
    res.status(500).json({ error: 'Error al obtener sector' });
  }
});

// PATCH /api/sectores/:id/activo - Activar/desactivar sector
router.patch('/:id/activo', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    const result = await pool.query(
      'UPDATE sectores SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [activo, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sector no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando sector:', error);
    res.status(500).json({ error: 'Error al actualizar sector' });
  }
});

module.exports = router;


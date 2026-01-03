const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/sectores', require('./routes/sectores'));
app.use('/api/industrias', require('./routes/industrias'));
app.use('/api/acciones', require('./routes/acciones'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir panel de administración
app.use(express.static(path.join(__dirname, 'public')));

// Root
app.get('/api', (req, res) => {
  res.json({
    message: 'Portafolio API',
    version: '1.0.0',
    endpoints: {
      sectores: '/api/sectores',
      industrias: '/api/industrias',
      acciones: '/api/acciones',
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
});


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const profileRoutes = require('./routes/profileRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GitHub Profile Analyzer API is running.',
    endpoints: {
      analyze: 'POST /api/profiles/:username',
      listAll: 'GET /api/profiles',
      getOne: 'GET /api/profiles/:username',
      history: 'GET /api/profiles/:username/history',
      delete: 'DELETE /api/profiles/:username',
      health: 'GET /health',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/profiles', profileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

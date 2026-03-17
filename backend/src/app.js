const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://employee-management-9azq.vercel.app',
  'https://employee-management-9azq-kwy70b1w1.vercel.app',
  'https://biztracker.co.in',
  'https://www.biztracker.co.in'
];

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

const isAllowedVercelPreviewOrigin = (origin) => {
  if (!origin) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && /^employee-management(?:-[a-z0-9]+)*\.vercel\.app$/i.test(hostname);
  } catch (_error) {
    return false;
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin) || isAllowedVercelPreviewOrigin(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');

const healthHandler = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    database: getDatabaseStatus(),
    timestamp: Date.now()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/v1', routes);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

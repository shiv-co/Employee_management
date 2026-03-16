const app = require('../src/app');
const connectDB = require('../src/config/db');
require('../src/config/env');

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://employee-management-9azq.vercel.app',
  'https://www.biztracker.co.in/',
  'https://employee-management-9azq-kwy70b1w1.vercel.app'
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

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || defaultAllowedOrigins[0]);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

module.exports = async (req, res) => {
  console.log('Incoming request:', req.method, req.url);

  try {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless error:', error);

    if (!res.headersSent) {
      applyCorsHeaders(req, res);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
      return;
    }

    res.end();
  }
};
